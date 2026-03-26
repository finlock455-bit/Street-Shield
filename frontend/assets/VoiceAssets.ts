// Voice Signature Asset Loader
// This loads your pre-recorded voice files into the app

export const VOICE_ASSETS = {
  checkin: [
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_1.wav'),
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_2.wav'),
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_3.wav'),
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_4.wav'),
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_5.wav'),
    require('./VoiceSignature/01_Checkin_Reassurance/checkin_warm_6.wav'),
  ],
  geofence: [
    require('./VoiceSignature/02_Awareness_Geofence/geofence_alert_1.wav'),
    require('./VoiceSignature/02_Awareness_Geofence/geofence_alert_2.wav'),
    require('./VoiceSignature/02_Awareness_Geofence/geofence_alert_3.wav'),
  ],
  emergency: [
    require('./VoiceSignature/03_Emergency_Alerts/emergency_alert_1.wav'),
    require('./VoiceSignature/03_Emergency_Alerts/emergency_alert_2.wav'),
    require('./VoiceSignature/03_Emergency_Alerts/emergency_alert_3.wav'),
    require('./VoiceSignature/03_Emergency_Alerts/emergency_alert_4.wav'),
    require('./VoiceSignature/03_Emergency_Alerts/emergency_alert_5.wav'),
  ],
  positive: [
    require('./VoiceSignature/04_Positive_Encouragement/positive_1.wav'),
    require('./VoiceSignature/04_Positive_Encouragement/positive_2.wav'),
    require('./VoiceSignature/04_Positive_Encouragement/positive_3.wav'),
    require('./VoiceSignature/04_Positive_Encouragement/positive_4.wav'),
    require('./VoiceSignature/04_Positive_Encouragement/positive_5.wav'),
  ],
  variation: [
    require('./VoiceSignature/05_Variation_Lines/variation_1.wav'),
    require('./VoiceSignature/05_Variation_Lines/variation_2.wav'),
    require('./VoiceSignature/05_Variation_Lines/variation_3.wav'),
    require('./VoiceSignature/05_Variation_Lines/variation_4.wav'),
  ],
  glue: [
    require('./VoiceSignature/06_Glue_Transitions/glue_1.wav'),
    require('./VoiceSignature/06_Glue_Transitions/glue_2.wav'),
    require('./VoiceSignature/06_Glue_Transitions/glue_3.wav'),
    require('./VoiceSignature/06_Glue_Transitions/glue_4.wav'),
  ],
  flow: [
    require('./VoiceSignature/07_Paragraph_Flow/flow_1.wav'),
    require('./VoiceSignature/07_Paragraph_Flow/flow_2.wav'),
  ],
};

// Voice signature descriptions for UI
export const VOICE_DESCRIPTIONS = {
  checkin: [
    "Hey, just checking in.",
    "I can see you made it safely.",
    "Looks like you're there.",
    "I can see you've arrived.",
    "Everything okay?",
    "I'm here if you need me.",
  ],
  geofence: [
    "This isn't your usual route.",
    "Hey, everything okay over there?",
    "Just a heads up—you're outside your usual area.",
  ],
  emergency: [
    "I've got your alert.",
    "I've received your alert.",
    "Stay where you are, if you can.",
    "Help is on the way.",
    "I'm here.",
  ],
  positive: [
    "Nice.",
    "Well done.",
    "Have a great day.",
    "Let me know when you get there.",
    "You made it safely.",
  ],
  variation: [
    "Looks like you made it.",
    "I can see everything's fine.",
    "All good from here.",
    "You're all good.",
  ],
  glue: [
    "Okay.",
    "All right.",
    "Hang on a second.",
    "Let me check that.",
  ],
  flow: [
    "Hey, I can see where you are and everything looks fine. If anything changes, let me know, okay?",
    "Just checking in—I can see you made it safely. Everything seems good. Let me know if you need anything.",
  ],
};
