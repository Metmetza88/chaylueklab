import base64
import copy
from io import BytesIO
import json
import math
from pathlib import Path
import subprocess
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw
from pyembroidery import read_dst, read_pes, read_jef, STITCH, JUMP, COLOR_CHANGE, END, COMMAND_MASK
from embroidery.engine import (digitize, compile_design, handle_payload, vector_object, options,
                               MAX_STITCHES, validate_design, fill_paths, decode_image)


def fixture(width=160, height=120, fmt="PNG"):
    im = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(im)
    draw.rectangle((10, 10, width//2-5, height-10), fill="#195f51")
    draw.rectangle((width//2+5, 10, width-10, height-10), fill="#d09a48")
    data = BytesIO(); im.save(data, format=fmt)
    return base64.b64encode(data.getvalue()).decode()


def payload(**kw):
    return {"image_base64": fixture(), "width_mm": 50, "colors": 2, "underlay": False, "pull_compensation": 0, **kw}


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.design = digitize(payload())

    def test_dst_is_real_binary_and_roundtrip_matches_preview(self):
        result = compile_design(self.design)
        data = base64.b64decode(result["file_base64"])
        self.assertTrue(data.startswith(b"LA:"))
        self.assertGreaterEqual(len(data), 512+3)
        self.assertEqual((len(data)-512) % 3, 0)
        read = read_dst(BytesIO(data), settings={"trim_at":None,"clipping":False})
        commands = [[x/10, y/10, c & COMMAND_MASK, 0] for x,y,c in read.stitches]
        self.assertEqual([c[:3] for c in commands], [c[:3] for c in result["commands"]])
        self.assertEqual(commands[-1][2], END)
        self.assertEqual(result["metrics"]["stitch_count"], sum(c[2] == STITCH for c in commands))

    def test_trim_inference_is_separate_from_literal_dst_simulation(self):
        from pyembroidery import TRIM
        r=compile_design(self.design)
        binary=base64.b64decode(r['file_base64'])
        inferred=read_dst(BytesIO(binary))
        self.assertEqual(r['metrics']['inferred_trim_count'],sum((s[2]&COMMAND_MASK)==TRIM for s in inferred.stitches))
        self.assertIsNone(r['metrics']['trim_count'])
        self.assertEqual(r['metrics']['explicit_trim_count'],0)
        self.assertFalse(any(c[2]==TRIM for c in r['commands']))

    def test_color_changes_only_between_colors_and_without_origin_move(self):
        result = compile_design(self.design)
        commands = result["commands"]
        changes = [i for i,c in enumerate(commands) if c[2] == COLOR_CHANGE]
        self.assertEqual(len(changes),len(result["thread_sequence"])-1)
        for i in changes:
            self.assertEqual(commands[i][:2],commands[i-1][:2])
        self.assertNotEqual(commands[-2][2],COLOR_CHANGE)
        self.assertEqual(result["metrics"]["thread_colors"], 2)

    def test_stitch_length_bound_after_dst_quantization(self):
        result = compile_design(self.design)
        self.assertLessEqual(result["metrics"]["max_stitch_mm"], 2.8 + .142)
        self.assertGreater(result["metrics"]["max_stitch_mm"], 1)

    def test_long_vector_is_split_instead_of_single_50mm_stitch(self):
        d = copy.deepcopy(self.design)
        d["settings"]["stitch_length"] = 2
        d["objects"] = [vector_object({"type":"running", "points":[[-25,0],[25,0]], "settings":{"stitch_length":2}})]
        r = compile_design(d)
        self.assertEqual(r["metrics"]["width_mm"], 50)
        self.assertEqual(r["metrics"]["stitch_count"], 26)
        self.assertLessEqual(r["metrics"]["max_stitch_mm"],2)

    def test_aspect_ratio_and_one_color_foreground(self):
        d = digitize(payload(colors=1))
        self.assertEqual(d["height_mm"],37.5)
        self.assertEqual(len({o['color'] for o in d['objects']}),1)
        self.assertGreater(compile_design(d)["metrics"]["stitch_count"],0)

    def test_fifteen_colors_allowed_and_fraction_rejected(self):
        self.assertEqual(options({"colors":15})["colors"],15)
        for value in (1.2,True,0,16):
            with self.subTest(value=value), self.assertRaises(ValueError): options({"colors":value})

    def test_jpeg_supported_and_transparency_does_not_become_black(self):
        self.assertGreater(len(digitize(payload(image_base64=fixture(fmt="JPEG")))["objects"]),0)
        im = Image.new('RGBA',(80,80),(0,0,0,0));ImageDraw.Draw(im).rectangle((20,20,60,60),fill='#195f51')
        f=BytesIO();im.save(f,format='PNG')
        d=digitize(payload(image_base64=base64.b64encode(f.getvalue()).decode(),colors=1))
        self.assertEqual(len(d['objects']),1)
        self.assertNotEqual(d['objects'][0]['color'],'#000000')

    def test_white_is_optional_and_blank_rejected(self):
        im=Image.new('RGB',(50,50),'white');f=BytesIO();im.save(f,format='PNG');b64=base64.b64encode(f.getvalue()).decode()
        with self.assertRaises(ValueError): digitize(payload(image_base64=b64))
        d=digitize(payload(image_base64=b64,remove_white=False,colors=1))
        self.assertEqual(d['objects'][0]['color'],'#ffffff')

    def test_invalid_images_and_decompression_bomb(self):
        for data in ('@!','YQ==',None,''):
            with self.subTest(data=data),self.assertRaises(ValueError): decode_image(data)
        original=Image.MAX_IMAGE_PIXELS
        try:
            Image.MAX_IMAGE_PIXELS=100
            with self.assertRaises(ValueError):decode_image(fixture())
        finally:Image.MAX_IMAGE_PIXELS=original

    def test_invalid_dimensions_finiteness_fabric_and_auto_satin(self):
        for key,value in [('width_mm',float('nan')),('width_mm',float('inf')),('density',.01),('stitch_length',9),('fabric','silk'),('underlay','false'),('stitch_type','satin')]:
            with self.subTest(key=key,value=value),self.assertRaises(ValueError): options({key:value})
        with self.assertRaises(ValueError):digitize(payload(image_base64=fixture(width=80,height=400)))
        with self.assertRaises(ValueError):handle_payload([])
        with self.assertRaises(ValueError):handle_payload({'action':'invalid'})

    def test_tatami_stagger_holes_and_rotation(self):
        mask=np.zeros((200,200),np.uint8);mask[10:190,10:190]=255;mask[70:130,70:130]=0
        for angle in (0,30,90):
            paths=fill_paths(mask,8,.5,2.8,angle)
            self.assertGreater(len(paths),0)
            # Check every stitch segment at dense samples; never sew across a hole.
            for path in paths:
                for a,b in zip(path['points'],path['points'][1:]):
                    for x,y in np.linspace(a,b,max(2,math.ceil(math.dist(a,b)*16))):
                        xx,yy=(x*8+99.5),(y*8+99.5)
                        self.assertFalse(72<xx<128 and 72<yy<128)
        paths=fill_paths(mask,8,.5,2.8,0)
        interior=[p for path in paths for p in path['points'] if -8<p[0]<-4]
        phases={round((p[0]*8)%22.4,1) for p in interior}
        self.assertGreater(len(phases),2)

    def test_underlay_precedes_fill_and_pull_expands_area(self):
        d=digitize(payload(underlay=True));kinds=[p['kind'] for p in d['objects'][0]['paths']]
        self.assertEqual(kinds[0],'underlay');self.assertIn('tatami',kinds)
        a=compile_design(digitize(payload(pull_compensation=0)))['metrics']
        b=compile_design(digitize(payload(pull_compensation=.4)))['metrics']
        self.assertGreater(b['width_mm'],a['width_mm'])

    def test_manual_satin_alternates_two_rails_and_polygon_fill(self):
        satin=vector_object({'type':'satin','points':[[-10,0],[10,0]],'satin_width':2,'settings':{'underlay':False}})
        pts=satin['paths'][0]['points']
        self.assertEqual(satin['paths'][0]['kind'],'satin')
        self.assertEqual(set(p[1] for p in pts),{-1.0,1.0})
        self.assertTrue(all(a[1]*b[1]<0 for a,b in zip(pts,pts[1:])))
        tatami=vector_object({'type':'tatami','points':[[-5,-5],[5,-5],[0,5]]})
        self.assertTrue(any(p['kind']=='tatami' for p in tatami['paths']))
        with self.assertRaises(ValueError):vector_object({'type':'satin','points':[[0,0],[10,0]],'satin_width':7})

    def test_editing_order_color_visibility_and_offsets_are_in_export(self):
        d=copy.deepcopy(self.design)
        d['objects'].reverse()
        d['objects'][0]['color']='#ff0000'
        d['objects'][0]['offset']=[5,3]
        r=compile_design(d)
        self.assertEqual(r['thread_sequence'][0]['color'],'#ff0000')
        d['objects'][0]['visible']=False
        hidden=compile_design(d)
        self.assertLess(hidden['metrics']['stitch_count'],r['metrics']['stitch_count'])
        self.assertEqual(hidden['metrics']['color_changes'],0)

    def test_export_pes_jef_and_reject_fake_emb(self):
        for fmt,reader in [('pes',read_pes),('jef',read_jef)]:
            with self.subTest(fmt=fmt):
                r=compile_design(self.design,fmt);p=reader(BytesIO(base64.b64decode(r['file_base64'])))
                self.assertGreater(sum((s[2]&COMMAND_MASK)==STITCH for s in p.stitches),0)
        with self.assertRaises(ValueError):compile_design(self.design,'emb')

    def test_untrusted_design_limits(self):
        for mutation in [lambda d:d.update(version=2),lambda d:d['objects'][0].update(color='<script>'),lambda d:d['objects'][0].update(offset=[float('inf'),0]),lambda d:d['objects'][0]['paths'][0].update(points=[[0,0],[float('nan'),1]]),lambda d:d['objects'].append(copy.deepcopy(d['objects'][0]))]:
            d=copy.deepcopy(self.design);mutation(d)
            with self.assertRaises(ValueError):validate_design(d)
        d=copy.deepcopy(self.design)
        d['objects']=[vector_object({'points':[[-50,0],[50,0]]})]
        d['objects'][0]['paths'] *= 410
        d['settings']['stitch_length']=.5
        with self.assertRaisesRegex(ValueError,'50,000'):compile_design(d)

    def test_cli_writes_machine_file_and_color_sidecar(self):
        with tempfile.TemporaryDirectory() as directory:
            src=Path(directory)/'input.png';src.write_bytes(base64.b64decode(fixture()))
            dst=Path(directory)/'result.dst'
            import sys
            r=subprocess.run([sys.executable,'embroidery/convert.py',str(src),'--output',str(dst),'--colors','2'],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stderr)
            self.assertTrue(dst.read_bytes().startswith(b'LA:'))
            self.assertGreater(len(json.loads(dst.with_suffix('.threads.json').read_text())),0)
            self.assertTrue(dst.with_suffix('.woramet.json').is_file())


if __name__ == '__main__':unittest.main()
