import unittest
from app.services.train_model import export_and_retrain, format_consultations_to_dataframe

class TestContinuousLearningRetrain(unittest.TestCase):
    def test_format_consultations(self):
        consultations = [
            {
                "latitude": 26.1850,
                "longitude": 91.7500,
                "reported_symptoms": ["watery_diarrhea", "vomiting"],
                "severity": "high",
                "ambient_telemetry_snapshot": {
                    "ph": 6.2,
                    "turbidity": 8.5,
                    "tds": 450.0,
                    "temperature": 27.0
                }
            }
        ]
        df = format_consultations_to_dataframe(consultations)
        self.assertEqual(len(df), 1)
        self.assertEqual(df.iloc[0]['risk_level'], 'High')
        self.assertEqual(df.iloc[0]['water_contamination_flag'], 1)
        self.assertEqual(df.iloc[0]['turbidity_ntu'], 8.5)

if __name__ == '__main__':
    unittest.main()
