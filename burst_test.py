#!/usr/bin/env python3
"""
Focused Backend API Testing for Burst Settings in Tinnitus Therapy App
Tests the specific burst configuration functionality as requested
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://tinnitus-relief.preview.emergentagent.com/api"

class BurstSettingsTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.created_settings_ids = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
    
    def test_create_burst_audio_settings(self):
        """Test POST /api/audio-settings with specific burst configuration"""
        test_data = {
            "name": "Tinnitus Relief - Burst Mode Therapy",
            "noise_types": {
                "white": {
                    "enabled": True,
                    "volume": 0.6
                }
            },
            "burst_settings": {
                "enabled": True,
                "frequency": 440,
                "duration": 1000,
                "interval": 2000
            },
            "timer_duration": 300
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/audio-settings",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "burst_settings" in data:
                    burst_settings = data["burst_settings"]
                    if (burst_settings.get("enabled") == True and 
                        burst_settings.get("frequency") == 440 and
                        burst_settings.get("duration") == 1000 and
                        burst_settings.get("interval") == 2000):
                        
                        self.created_settings_ids.append(data["id"])
                        self.log_result("Create Burst Audio Settings", True, 
                                      f"Created with ID: {data['id']}, Burst enabled: {burst_settings['enabled']}")
                        return data["id"]
                    else:
                        self.log_result("Create Burst Audio Settings", False, 
                                      f"Burst settings not correctly saved: {burst_settings}")
                else:
                    self.log_result("Create Burst Audio Settings", False, 
                                  "Missing required fields in response")
            else:
                self.log_result("Create Burst Audio Settings", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Burst Audio Settings", False, f"Exception: {str(e)}")
        
        return None
    
    def test_get_burst_settings(self, settings_id):
        """Test GET /api/audio-settings/{id} to verify burst settings persistence"""
        if not settings_id:
            self.log_result("Get Burst Settings", False, "No settings ID provided")
            return
        
        try:
            response = requests.get(f"{self.base_url}/audio-settings/{settings_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "burst_settings" in data:
                    burst_settings = data["burst_settings"]
                    self.log_result("Get Burst Settings", True, 
                                  f"Burst settings retrieved: enabled={burst_settings.get('enabled')}, "
                                  f"frequency={burst_settings.get('frequency')}Hz, "
                                  f"duration={burst_settings.get('duration')}ms, "
                                  f"interval={burst_settings.get('interval')}ms")
                    return burst_settings
                else:
                    self.log_result("Get Burst Settings", False, 
                                  "No burst_settings in response")
            else:
                self.log_result("Get Burst Settings", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Burst Settings", False, f"Exception: {str(e)}")
        
        return None
    
    def test_update_burst_settings(self, settings_id):
        """Test PUT /api/audio-settings/{id} to update burst configuration"""
        if not settings_id:
            self.log_result("Update Burst Settings", False, "No settings ID provided")
            return
        
        update_data = {
            "burst_settings": {
                "enabled": True,
                "frequency": 880,
                "duration": 1500,
                "interval": 3000
            },
            "timer_duration": 600
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/audio-settings/{settings_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "burst_settings" in data:
                    burst_settings = data["burst_settings"]
                    if (burst_settings.get("frequency") == 880 and
                        burst_settings.get("duration") == 1500 and
                        burst_settings.get("interval") == 3000):
                        
                        self.log_result("Update Burst Settings", True, 
                                      f"Updated burst settings: frequency={burst_settings['frequency']}Hz, "
                                      f"duration={burst_settings['duration']}ms, "
                                      f"interval={burst_settings['interval']}ms")
                    else:
                        self.log_result("Update Burst Settings", False, 
                                      f"Burst settings not correctly updated: {burst_settings}")
                else:
                    self.log_result("Update Burst Settings", False, 
                                  "No burst_settings in response")
            else:
                self.log_result("Update Burst Settings", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Update Burst Settings", False, f"Exception: {str(e)}")
    
    def test_disable_burst_settings(self, settings_id):
        """Test disabling burst settings"""
        if not settings_id:
            self.log_result("Disable Burst Settings", False, "No settings ID provided")
            return
        
        update_data = {
            "burst_settings": {
                "enabled": False,
                "frequency": 440,
                "duration": 1000,
                "interval": 2000
            }
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/audio-settings/{settings_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "burst_settings" in data:
                    burst_settings = data["burst_settings"]
                    if burst_settings.get("enabled") == False:
                        self.log_result("Disable Burst Settings", True, 
                                      f"Burst settings disabled successfully")
                    else:
                        self.log_result("Disable Burst Settings", False, 
                                      f"Burst settings not disabled: enabled={burst_settings.get('enabled')}")
                else:
                    self.log_result("Disable Burst Settings", False, 
                                  "No burst_settings in response")
            else:
                self.log_result("Disable Burst Settings", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Disable Burst Settings", False, f"Exception: {str(e)}")
    
    def test_delete_burst_settings(self, settings_id):
        """Test DELETE /api/audio-settings/{id}"""
        if not settings_id:
            self.log_result("Delete Burst Settings", False, "No settings ID provided")
            return
        
        try:
            response = requests.delete(f"{self.base_url}/audio-settings/{settings_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Delete Burst Settings", True, 
                                  f"Deleted successfully: {data['message']}")
                else:
                    self.log_result("Delete Burst Settings", False, 
                                  "Missing success message")
            else:
                self.log_result("Delete Burst Settings", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Delete Burst Settings", False, f"Exception: {str(e)}")
    
    def run_burst_tests(self):
        """Run focused burst settings tests"""
        print("=" * 60)
        print("TINNITUS THERAPY BURST SETTINGS API TESTING")
        print("=" * 60)
        print(f"Testing backend at: {self.base_url}")
        print(f"Test started at: {datetime.now()}")
        print()
        
        # Test burst settings CRUD operations
        print("--- BURST SETTINGS FOCUSED TESTS ---")
        
        # Create with burst settings
        settings_id = self.test_create_burst_audio_settings()
        
        # Retrieve and verify burst settings
        if settings_id:
            self.test_get_burst_settings(settings_id)
            
            # Update burst settings
            self.test_update_burst_settings(settings_id)
            
            # Disable burst settings
            self.test_disable_burst_settings(settings_id)
            
            # Cleanup
            print("\n--- CLEANUP ---")
            self.test_delete_burst_settings(settings_id)
        
        # Final summary
        print("\n" + "=" * 60)
        print("BURST SETTINGS TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results["errors"]:
            print("\nFAILED TESTS:")
            for error in self.test_results["errors"]:
                print(f"  - {error}")
        
        success_rate = (self.test_results["passed"] / 
                       (self.test_results["passed"] + self.test_results["failed"])) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return self.test_results["failed"] == 0

if __name__ == "__main__":
    tester = BurstSettingsTester()
    success = tester.run_burst_tests()
    
    if success:
        print("\n🎉 ALL BURST SETTINGS TESTS PASSED!")
        print("Backend burst functionality is ready for frontend integration!")
        sys.exit(0)
    else:
        print("\n⚠️  SOME BURST TESTS FAILED - Backend needs attention")
        sys.exit(1)