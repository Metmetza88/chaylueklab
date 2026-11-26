import http.client
import json
import threading
from http.server import ThreadingHTTPServer
import importlib.util
from pathlib import Path
import unittest
from test_engine import fixture

spec=importlib.util.spec_from_file_location('test_api',Path('api/embroidery.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class QuietHandler(module.handler):
    def log_message(self,*args):pass


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()

    def request(self,body=None,headers=None,method='POST'):
        conn=http.client.HTTPConnection(*self.server.server_address,timeout=10)
        conn.request(method,'/api/embroidery',body,headers or {'Content-Type':'application/json'})
        response=conn.getresponse();data=json.loads(response.read());status=response.status;head=dict(response.getheaders());conn.close();return status,data,head

    def test_health_and_capabilities_are_truthful(self):
        status,data,headers=self.request(method='GET')
        self.assertEqual(status,200);self.assertEqual(data['capabilities']['machine_test'],'not_tested')
        self.assertEqual(data['storage'],'browser_local_only');self.assertEqual(headers['Cache-Control'],'no-store')

    def test_conversion_and_export_over_real_http(self):
        status,result,_=self.request(json.dumps({'image_base64':fixture(),'colors':2,'width_mm':50}))
        self.assertEqual(status,200);self.assertGreater(result['metrics']['stitch_count'],0)
        status,export,_=self.request(json.dumps({'action':'export','design':result['design'],'format':'dst'}))
        self.assertEqual(status,200);self.assertEqual(export['commands'],result['commands'])

    def test_bad_json_media_type_and_non_object(self):
        for raw in ('{bad','[]','null','{"width_mm":NaN}'):
            with self.subTest(raw=raw):self.assertEqual(self.request(raw)[0],400)
        self.assertEqual(self.request('{}',{'Content-Type':'text/plain'})[0],415)

    def test_oversize_request_is_rejected_before_body_is_read(self):
        status,data,_=self.request('',{'Content-Type':'application/json','Content-Length':'3600001'})
        self.assertEqual(status,413);self.assertIn('error',data)

    def test_unsupported_emb_and_auto_satin_are_rejected(self):
        status,_,_=self.request(json.dumps({'stitch_type':'satin','image_base64':fixture()}))
        self.assertEqual(status,400)
        status,data,_=self.request(json.dumps({'action':'export','format':'emb','design':{}}))
        self.assertEqual(status,400);self.assertIn('Not Available',data['error'])


if __name__=='__main__':unittest.main()
