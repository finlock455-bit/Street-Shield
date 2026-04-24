#!/usr/bin/env python3
"""Deep rename script for Street Shield - emergency → alert compliance refactor"""
import re
import os

def apply_replacements(content, replacements):
    """Apply replacements in order (specific first, then general)"""
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    return content

# ============================================================
# FRONTEND index.tsx replacements
# ============================================================
def refactor_index_tsx():
    filepath = "/app/frontend/app/index.tsx"
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Order matters: specific/longer patterns first, then shorter/general ones
    replacements = [
        # --- AsyncStorage keys (string literals) ---
        (r"'emergencyTriggerWord'", "'alertTriggerWord'"),
        (r"'emergencyContacts'", "'trustedContacts'"),
        (r"'pendingEmergency'", "'pendingAlert'"),
        (r"'bluetoothEmergencyBeacon'", "'bluetoothAlertBeacon'"),
        
        # --- API routes ---
        (r'/api/emergency/settings', '/api/alert/settings'),
        (r'/api/emergency/trigger', '/api/alert/trigger'),
        
        # --- State setter + variable renames (longer names first) ---
        (r'\bsetIsEmergencySetupOpen\b', 'setIsAlertSetupOpen'),
        (r'\bsetIsEmergencyModeActive\b', 'setIsAlertModeActive'),
        (r'\bsetEmergencyTriggerWord\b', 'setAlertTriggerWord'),
        (r'\bsetEmergencyContacts\b', 'setTrustedContacts'),
        (r'\bisEmergencySetupOpen\b', 'isAlertSetupOpen'),
        (r'\bisEmergencyModeActive\b', 'isAlertModeActive'),
        (r'\bemergencyModeStartTime\b', 'alertModeStartTime'),
        (r'\bemergencyTriggerWord\b', 'alertTriggerWord'),
        (r'\bemergencyContacts\b', 'trustedContacts'),
        
        # --- Function renames ---
        (r'\btriggerOfflineEmergencySignals\b', 'triggerOfflineAlertSignals'),
        (r'\bbroadcastBluetoothEmergency\b', 'broadcastBluetoothAlert'),
        (r'\battemptSatelliteEmergency\b', 'attemptSatelliteAlert'),
        (r'\bstartEmergencyRetryLoop\b', 'startAlertRetryLoop'),
        (r'\bofflineEmergencyMode\b', 'offlineAlertMode'),
        (r'\bsendEmergencyAlerts\b', 'sendAlertNotifications'),
        (r'\btriggerEmergencyMode\b', 'triggerAlertMode'),
        (r'\bdeactivateEmergencyMode\b', 'deactivateAlertMode'),
        (r'\bsetupEmergencyTrigger\b', 'setupAlertTrigger'),
        (r'\bsaveEmergencySettings\b', 'saveAlertSettings'),
        
        # --- Local variable renames ---
        (r'\bofflineEmergencyData\b', 'offlineAlertData'),
        (r'\bemergencySettings\b', 'alertSettings'),
        (r'\bemergencyEvent\b', 'alertEvent'),
        (r'\bemergency_triggered\b', 'alert_triggered'),
        (r'\bauto_emergency\b', 'auto_alert'),
        
        # --- Style name renames ---
        (r'\bemergencyBanner\b', 'alertBanner'),
        (r'\bemergencyBannerText\b', 'alertBannerText'),
        (r'\bemergencyButton\b', 'alertButton'),
        (r'\btestEmergencyButton\b', 'testAlertButton'),
        (r'\bemergencyActiveButton\b', 'alertActiveButton'),
        (r'\bemergencyTestButton\b', 'alertTestButton'),
        (r'\bemergencyStatusCard\b', 'alertStatusCard'),
        (r'\bemergencyHeader\b', 'alertHeader'),
        (r'\bemergencyStatusTitle\b', 'alertStatusTitle'),
        (r'\bemergencyDetails\b', 'alertDetails'),
        (r'\bemergencyDetailItem\b', 'alertDetailItem'),
        (r'\bemergencyDetailText\b', 'alertDetailText'),
        (r'\bemergencyContactsList\b', 'alertContactsList'),
        (r'\bemergencyContactsTitle\b', 'alertContactsTitle'),
        (r'\bemergencyContact\b', 'alertContact'),
        (r'\bdeactivateEmergencyButton\b', 'deactivateAlertButton'),
        (r'\bdeactivateEmergencyText\b', 'deactivateAlertText'),
        (r'\bemergencyNote\b', 'alertNote'),
        
        # --- Comment cleanup (JSX comments) ---
        (r'Emergency Mode Indicator', 'Alert Mode Indicator'),
        (r'Test Emergency Trigger Button', 'Test Alert Trigger Button'),
        (r'Emergency Active Indicator', 'Alert Active Indicator'),
        (r'Emergency Mode Status Display', 'Alert Mode Status Display'),
        (r'Emergency Setup Modal', 'Alert Setup Modal'),
        (r'Emergency system state', 'Alert system state'),
        (r'Emergency System Functions', 'Alert System Functions'),
        (r'OFFLINE EMERGENCY MODE', 'OFFLINE ALERT MODE'),
        
        # --- Console.log/comment cleanup ---
        (r'Online emergency triggered', 'Online alert triggered'),
        (r'Error sending emergency alerts', 'Error sending alert notifications'),
        (r'Satellite emergency', 'Satellite alert'),
        (r'satellite emergency', 'satellite alert'),
        (r'Bluetooth emergency', 'Bluetooth alert'),
        (r'emergency beacon', 'alert beacon'),
        (r'offline emergency mode', 'offline alert mode'),
        (r'pending emergency', 'pending alert'),
        (r'emergency mode', 'alert mode'),
        (r'emergency system', 'alert system'),
        (r'Handle emergency situations', 'Handle alert situations'),
        (r'Load emergency settings', 'Load alert settings'),
        (r'Error saving emergency settings', 'Error saving alert settings'),
        (r'No location available for emergency alert', 'No location available for alert notification'),
        (r'No network connection - activating offline emergency mode', 'No network connection - activating offline alert mode'),
        (r'Sending pending emergency', 'Sending pending alert'),
        (r'Connection restored! Sending pending emergency', 'Connection restored! Sending pending alert'),
        (r'Broadcasting Bluetooth emergency beacon', 'Broadcasting Bluetooth alert beacon'),
        (r'Emergency beacon data stored', 'Alert beacon data stored'),
        (r'Attempting satellite emergency', 'Attempting satellite alert'),
        (r'Satellite emergency initiated', 'Satellite alert initiated'),
        (r'Satellite emergency only available', 'Satellite alert only available'),
        (r'Error starting hands-free mode', 'Error starting hands-free mode'),
        (r'emergency detection', 'alert detection'),
        (r'Immediate emergency response', 'Immediate alert response'),
        (r'Start emergency monitoring', 'Start alert monitoring'),
        (r'emergency contacts', 'trusted contacts'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated: {filepath}")

# ============================================================
# BACKEND server.py replacements
# ============================================================
def refactor_server_py():
    filepath = "/app/backend/server.py"
    with open(filepath, 'r') as f:
        content = f.read()
    
    replacements = [
        # --- Pydantic model renames ---
        (r'\bEmergencyAlert\b', 'AlertNotification'),
        (r'\bEmergencySettings\b', 'AlertSettings'),
        
        # --- API route paths ---
        (r'"/emergency/settings"', '"/alert/settings"'),
        (r'"/emergency/settings/{user_id}"', '"/alert/settings/{user_id}"'),
        (r'"/emergency/trigger"', '"/alert/trigger"'),
        (r'"/emergency/vehicle-detected"', '"/alert/vehicle-detected"'),
        
        # --- DB collection names ---
        (r'db\.emergency_alerts\b', 'db.alert_notifications'),
        (r'db\.emergency_settings\b', 'db.alert_settings'),
        
        # --- Function names ---
        (r'\bsave_emergency_settings\b', 'save_alert_settings'),
        (r'\bget_emergency_settings\b', 'get_alert_settings'),
        (r'\btrigger_emergency\b', 'trigger_alert'),
        (r'\bdetect_emergency_vehicle\b', 'detect_alert_vehicle'),
        
        # --- Variable names ---
        (r'\bemergency_alert\b', 'alert_notification'),
        (r'\bemergency_triggered\b', 'alert_triggered'),
        (r'\bauto_emergency\b', 'auto_alert'),
        (r'\bemergency_vehicles\b', 'alert_vehicles'),
        
        # --- String literals / comments ---
        (r'"emergency_vehicles"', '"priority_vehicles"'),
        (r'Save user emergency settings', 'Save user alert settings'),
        (r'Get user emergency settings', 'Get user alert settings'),
        (r'Alert settings saved', 'Alert settings saved'),  # already correct
        (r'Error saving alert settings', 'Error saving alert settings'),  # already correct
        (r'No alert settings found', 'No alert settings found'),  # already correct
        
        # --- Medical → Health (where user-facing) ---
        (r'\buser_medical_conditions\b', 'user_health_conditions'),
        (r'\bmedical_conditions\b', 'health_conditions'),
        (r'"medical_emergency"', '"health_alert"'),
        (r'medically accurate', 'clinically informed'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated: {filepath}")

# ============================================================
# TRANSLATIONS index.ts replacements
# ============================================================
def refactor_translations():
    filepath = "/app/frontend/translations/index.ts"
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Rename the translation keys from emergency* to alert*
    replacements = [
        # Key renames
        (r'\bemergencySetup\b', 'alertSetup'),
        (r'\bemergencyContacts\b', 'trustedContacts'),
        (r'\bsetupEmergency\b', 'setupAlert'),
        (r'\btestEmergency\b', 'testAlert'),
        (r'\bemergencyActive\b', 'alertActive'),
        (r'\bemergencySetupComplete\b', 'alertSetupComplete'),
        (r'\bemergencyActivated\b', 'alertActivated'),
        (r'\bemergencyModeActive\b', 'alertModeActive'),
        (r'\bemergencyContactsNotified\b', 'alertContactsNotified'),
        (r'\bdeactivateEmergency\b', 'deactivateAlert'),
        # The key 'emergency' itself - be careful, only match the key name
        (r"(\s+)emergency:", r"\1quickAlert:"),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated: {filepath}")

# ============================================================
# OTHER FILES
# ============================================================
def refactor_custom_voice_manager():
    filepath = "/app/frontend/utils/CustomVoiceManager.ts"
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace("'emergency': 'emergency_alert'", "'alert': 'alert_notification'")
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated: {filepath}")

def refactor_voice_clone_setup():
    filepath = "/app/frontend/components/VoiceCloneSetup.tsx"
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace(
        "Emergency alert activated. Notifying your contacts now.",
        "Quick alert activated. Notifying your contacts now."
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated: {filepath}")

# ============================================================
# RUN ALL
# ============================================================
if __name__ == "__main__":
    refactor_index_tsx()
    refactor_server_py()
    refactor_translations()
    refactor_custom_voice_manager()
    refactor_voice_clone_setup()
    print("\n✅ Deep rename refactor complete.")
