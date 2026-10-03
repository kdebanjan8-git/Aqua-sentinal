import unittest
import io
import base64
from PIL import Image
from app.services.image_analyzer import image_analyzer

class TestImageAnalyzer(unittest.TestCase):
    def test_turbid_water_detection(self):
        # Brown/yellowish turbid water sample
        img = Image.new('RGB', (80, 80), color=(170, 120, 60))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        img_bytes = buf.getvalue()

        res = image_analyzer.analyze_image_bytes(img_bytes, filename="turbid_sample.jpg")
        self.assertTrue(res['has_image'])
        self.assertTrue(res['is_abnormal'])
        self.assertGreater(res['estimated_turbidity_ntu'], 5.0)
        self.assertIn("Yellow-brown", res['visual_cue'])

    def test_clear_water_detection(self):
        # Clear, bright water sample
        img = Image.new('RGB', (80, 80), color=(230, 240, 250))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        img_bytes = buf.getvalue()

        res = image_analyzer.analyze_image_bytes(img_bytes, filename="clear_sample.jpg")
        self.assertTrue(res['has_image'])
        self.assertFalse(res['is_abnormal'])
        self.assertLessEqual(res['estimated_turbidity_ntu'], 2.0)
        self.assertIn("High optical clarity", res['visual_cue'])

    def test_base64_decoding(self):
        img = Image.new('RGB', (50, 50), color=(180, 110, 50))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

        res = image_analyzer.analyze_base64(b64)
        self.assertTrue(res['has_image'])
        self.assertTrue(res['is_abnormal'])

if __name__ == '__main__':
    unittest.main()
