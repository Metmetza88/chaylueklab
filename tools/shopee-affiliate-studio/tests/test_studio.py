"""Run with python -m unittest discover -s tests -v from project root."""
import os
import tempfile
import unittest
from pathlib import Path

import core

class StudioTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.home=Path(self.tmp.name)
        self.conn=core.db_connect(self.home)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def test_seeds_only_once(self):
        self.assertEqual(len(core.get_products(self.conn)),2)
        self.conn.execute('DELETE FROM products');self.conn.commit();self.conn.close()
        self.conn=core.db_connect(self.home)
        self.assertEqual(core.get_products(self.conn),[])

    def test_create_validate_and_commission(self):
        ident=core.save_product(self.conn,{"name":"ขาตั้งมือถือ","price":"249","rate":"7.5","url":"https://shopee.co.th/foo","verified":True,"note":"วัสดุโลหะ (จากหน้าสินค้า)"})
        p=next(p for p in core.get_products(self.conn) if p['id']==ident)
        self.assertEqual(p['expected'],18.68)
        self.assertTrue(p['verified'])
        self.assertIn('Affiliate',core.offline_content(p)['caption'])
        with self.assertRaises(ValueError):core.save_product(self.conn,{"name":"bad","price":100,"rate":150})
        with self.assertRaises(ValueError):core.save_product(self.conn,{"name":"bad","url":"javascript:alert(1)"})

    def test_csv_import_and_export(self):
        result=core.import_csv_products(self.conn,'name,price,rate,url\nตัวอย่างสินค้า,100,5,https://example.org/p\n')
        self.assertEqual(result['imported'],1)
        self.assertIn('ตัวอย่างสินค้า',core.export_products_csv(self.conn))

    def test_earnings_deduplication(self):
        csv='order_id,commission,date\nORD-01,15.75,2026-10-01\nORD-02,-2.25,2026-10-02\n'
        self.assertEqual(core.import_earnings(self.conn,csv)['imported'],2)
        self.assertEqual(core.import_earnings(self.conn,csv)['imported'],0)
        self.assertAlmostEqual(self.conn.execute('SELECT SUM(amount) FROM earnings').fetchone()[0],13.5)

    def test_batch(self):
        output=core.batch_drafts(self.conn,2)
        self.assertIn('CHAYLUEKLAB',output)
        self.assertEqual(self.conn.execute('SELECT COUNT(*) FROM drafts').fetchone()[0],2)

if __name__=='__main__':unittest.main()
