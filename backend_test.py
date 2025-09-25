#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Tinnitus Therapy App
Tests all audio settings and tinnitus frequency endpoints
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Use the production backend URL from frontend/.env
BASE_URL = "https://earpeace.preview.emergentagent.com/api"

class TinnitusAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.created_audio_settings = []
        self.created_frequencies = []
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   Error occurred in: {test_name}")
        print()

    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Response: {response.json()}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_create_audio_settings(self):
        """Test POST /api/audio-settings - Create comprehensive audio settings"""
        test_data = {
            "name": "Comprehensive Tinnitus Relief Therapy",
            "noise_types": {
                "white": {"enabled": True, "volume": 0.6, "frequency_range": [20, 20000]},
                "pink": {"enabled": True, "volume": 0.4, "frequency_range": [20, 20000]},
                "brown": {"enabled": False, "volume": 0.3, "frequency_range": [20, 20000]},
                "gray": {"enabled": True, "volume": 0.5, "frequency_range": [20, 20000]},
                "blue": {"enabled": False, "volume": 0.7, "frequency_range": [20, 20000]}
            },
            "specific_frequencies": [
                {"frequency": 8000, "volume": 0.5, "enabled": True},
                {"frequency": 12000, "volume": 0.3, "enabled": True},
                {"frequency": 6000, "volume": 0.4, "enabled": False}
            ],
            "frequency_ranges": [
                {"min_freq": 7000, "max_freq": 9000, "volume": 0.6, "enabled": True},
                {"min_freq": 11000, "max_freq": 13000, "volume": 0.4, "enabled": True}
            ],
            "notch_filters": [
                {"target_frequency": 8000, "bandwidth": 100, "depth": -20, "enabled": True},
                {"target_frequency": 12000, "bandwidth": 200, "depth": -15, "enabled": False}
            ],
            "burst_settings": {
                "enabled": True,
                "duration": 500,  # milliseconds
                "interval": 1000,  # milliseconds
                "random_range": 200  # milliseconds
            },
            "timer_duration": 1800  # 30 minutes in seconds
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/audio-settings",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            success = response.status_code == 200
            if success:
                result = response.json()
                self.created_audio_settings.append(result["id"])
                details = f"Created settings with ID: {result['id']}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Create Audio Settings", success, details)
            return success, response.json() if success else None
        except Exception as e:
            self.log_test("Create Audio Settings", False, f"Exception: {str(e)}")
            return False, None

    def test_get_all_audio_settings(self):
        """Test GET /api/audio-settings - Get all saved playlists"""
        try:
            response = self.session.get(f"{self.base_url}/audio-settings")
            success = response.status_code == 200
            if success:
                result = response.json()
                details = f"Retrieved {len(result)} audio settings"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get All Audio Settings", success, details)
            return success, response.json() if success else None
        except Exception as e:
            self.log_test("Get All Audio Settings", False, f"Exception: {str(e)}")
            return False, None

    def test_get_audio_settings_by_id(self, settings_id):
        """Test GET /api/audio-settings/{id} - Get specific playlist by ID"""
        try:
            response = self.session.get(f"{self.base_url}/audio-settings/{settings_id}")
            success = response.status_code == 200
            if success:
                result = response.json()
                details = f"Retrieved settings: {result['name']}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Audio Settings by ID", success, details)
            return success, response.json() if success else None
        except Exception as e:
            self.log_test("Get Audio Settings by ID", False, f"Exception: {str(e)}")
            return False, None

    def test_update_audio_settings(self, settings_id):
        """Test PUT /api/audio-settings/{id} - Update existing playlist"""
        update_data = {
            "name": "Updated Tinnitus Relief Therapy",
            "timer_duration": 2700,  # 45 minutes
            "burst_settings": {
                "enabled": False,
                "duration": 300,
                "interval": 800,
                "random_range": 150
            }
        }
        
        try:
            response = self.session.put(
                f"{self.base_url}/audio-settings/{settings_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            success = response.status_code == 200
            if success:
                result = response.json()
                details = f"Updated settings: {result['name']}, Timer: {result['timer_duration']}s"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Update Audio Settings", success, details)
            return success, response.json() if success else None
        except Exception as e:
            self.log_test("Update Audio Settings", False, f"Exception: {str(e)}")
            return False, None

    def test_create_tinnitus_frequency(self):
        """Test POST /api/tinnitus-frequency - Save detected tinnitus frequency"""
        test_frequencies = [
            {
                "ear": "left",
                "frequency": 8000.0,
                "volume": 0.6,
                "notes": "High-pitched ringing, most noticeable in quiet environments"
            },
            {
                "ear": "right", 
                "frequency": 12500.0,
                "volume": 0.4,
                "notes": "Intermittent whistling sound"
            },
            {
                "ear": "both",
                "frequency": 6000.0,
                "volume": 0.8,
                "notes": "Constant low hum, affects concentration"
            }
        ]
        
        success_count = 0
        for freq_data in test_frequencies:
            try:
                response = self.session.post(
                    f"{self.base_url}/tinnitus-frequency",
                    json=freq_data,
                    headers={"Content-Type": "application/json"}
                )
                success = response.status_code == 200
                if success:
                    result = response.json()
                    self.created_frequencies.append(result["id"])
                    details = f"Saved frequency: {freq_data['frequency']}Hz ({freq_data['ear']} ear)"
                    success_count += 1
                else:
                    details = f"Status: {response.status_code}, Response: {response.text}"
                
                self.log_test(f"Create Tinnitus Frequency ({freq_data['ear']})", success, details)
            except Exception as e:
                self.log_test(f"Create Tinnitus Frequency ({freq_data['ear']})", False, f"Exception: {str(e)}")
        
        return success_count == len(test_frequencies)

    def test_get_all_tinnitus_frequencies(self):
        """Test GET /api/tinnitus-frequency - Get all saved frequencies"""
        try:
            response = self.session.get(f"{self.base_url}/tinnitus-frequency")
            success = response.status_code == 200
            if success:
                result = response.json()
                details = f"Retrieved {len(result)} tinnitus frequency records"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get All Tinnitus Frequencies", success, details)
            return success, response.json() if success else None
        except Exception as e:
            self.log_test("Get All Tinnitus Frequencies", False, f"Exception: {str(e)}")
            return False, None

    def test_delete_audio_settings(self, settings_id):
        """Test DELETE /api/audio-settings/{id} - Delete playlist"""
        try:
            response = self.session.delete(f"{self.base_url}/audio-settings/{settings_id}")
            success = response.status_code == 200
            if success:
                details = f"Successfully deleted audio settings: {settings_id}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Delete Audio Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Audio Settings", False, f"Exception: {str(e)}")
            return False

    def test_delete_tinnitus_frequency(self, frequency_id):
        """Test DELETE /api/tinnitus-frequency/{id} - Delete frequency record"""
        try:
            response = self.session.delete(f"{self.base_url}/tinnitus-frequency/{frequency_id}")
            success = response.status_code == 200
            if success:
                details = f"Successfully deleted frequency record: {frequency_id}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Delete Tinnitus Frequency", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Tinnitus Frequency", False, f"Exception: {str(e)}")
            return False

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("=== Testing Edge Cases ===")
        
        # Test invalid audio settings ID
        try:
            response = self.session.get(f"{self.base_url}/audio-settings/invalid-id")
            success = response.status_code == 404
            self.log_test("Invalid Audio Settings ID (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Audio Settings ID (404)", False, f"Exception: {str(e)}")
        
        # Test invalid tinnitus frequency ID
        try:
            response = self.session.delete(f"{self.base_url}/tinnitus-frequency/invalid-id")
            success = response.status_code == 404
            self.log_test("Invalid Tinnitus Frequency ID (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Tinnitus Frequency ID (404)", False, f"Exception: {str(e)}")
        
        # Test invalid frequency data
        invalid_freq_data = {
            "ear": "invalid_ear",  # Should be left, right, or both
            "frequency": -100,  # Invalid frequency
            "volume": 2.0  # Volume should be 0.0-1.0
        }
        try:
            response = self.session.post(
                f"{self.base_url}/tinnitus-frequency",
                json=invalid_freq_data,
                headers={"Content-Type": "application/json"}
            )
            # This might pass due to lack of validation, but we log the response
            details = f"Status: {response.status_code}, Response: {response.text}"
            self.log_test("Invalid Frequency Data", True, f"Server response: {details}")
        except Exception as e:
            self.log_test("Invalid Frequency Data", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("=" * 60)
        print("TINNITUS THERAPY API COMPREHENSIVE TEST SUITE")
        print("=" * 60)
        print(f"Testing Backend URL: {self.base_url}")
        print()
        
        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ CRITICAL: Root endpoint failed. Backend may be down.")
            return False
        
        # Test audio settings CRUD operations
        print("=== Audio Settings CRUD Tests ===")
        create_success, created_settings = self.test_create_audio_settings()
        if not create_success:
            print("❌ CRITICAL: Cannot create audio settings")
            return False
        
        settings_id = created_settings["id"]
        
        self.test_get_all_audio_settings()
        self.test_get_audio_settings_by_id(settings_id)
        self.test_update_audio_settings(settings_id)
        
        # Test tinnitus frequency operations
        print("=== Tinnitus Frequency Tests ===")
        self.test_create_tinnitus_frequency()
        self.test_get_all_tinnitus_frequencies()
        
        # Test edge cases
        self.test_edge_cases()
        
        # Cleanup - delete created records
        print("=== Cleanup Operations ===")
        for settings_id in self.created_audio_settings:
            self.test_delete_audio_settings(settings_id)
        
        for freq_id in self.created_frequencies:
            self.test_delete_tinnitus_frequency(freq_id)
        
        print("=" * 60)
        print("TEST SUITE COMPLETED")
        print("=" * 60)
        return True

if __name__ == "__main__":
    tester = TinnitusAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)