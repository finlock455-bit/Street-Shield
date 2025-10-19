import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

const i18n = new I18n({
  en: {
    // App Title
    appTitle: 'Street Shield',
    
    // Main Status
    analyzing: 'Analyzing your safety...',
    safetyScore: 'Safety Score',
    location: 'Location',
    weather: 'Weather',
    temperature: 'Temperature',
    
    // Safety Status
    veryLow: 'Very Low Risk',
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
    
    // Emergency
    emergency: 'Emergency',
    emergencySetup: 'Emergency Setup',
    emergencyContacts: 'Emergency Contacts',
    triggerWord: 'Trigger Word',
    setupEmergency: 'Setup Emergency',
    testEmergency: 'Test Emergency',
    demoTrigger: 'DEMO TRIGGER',
    emergencyActive: 'EMERGENCY ACTIVE',
    contactsAlerted: 'CONTACTS ALERTED',
    saveContacts: 'Save Contacts',
    cancel: 'Cancel',
    
    // Emergency Messages
    emergencySetupComplete: 'Emergency setup complete. Trigger word: {{word}}. {{count}} contact(s) added.',
    emergencyActivated: 'Emergency activated. Alerting contacts now.',
    handsFreeActive: 'Hands-free mode active. Listening for {{word}}.',
    
    // Features
    handsFreeMode: 'Hands-Free Mode',
    tapToStart: 'TAP TO START',
    active: 'ACTIVE',
    listening: 'LISTENING',
    voiceInfoReady: 'Voice info ready. Say Street Shield, then your question.',
    
    // Cycling
    cyclingMode: 'Cycling Mode',
    startCycling: 'Start Cycling',
    stopCycling: 'Stop Cycling',
    cyclingActive: 'CYCLING ACTIVE',
    cyclingSafetyMonitor: 'Cycling Safety Monitor',
    currentSpeed: 'Current Speed',
    averageSpeed: 'Average Speed',
    safetyScoreLabel: 'Safety Score',
    roadType: 'Road Type',
    activeThreats: 'Active Threats',
    riskLevel: 'Risk Level',
    traffic: 'Traffic',
    experience: 'Experience',
    
    // Health
    healthMonitoring: 'Health Monitoring',
    heartRate: 'Heart Rate',
    bloodOxygen: 'Blood Oxygen',
    stressLevel: 'Stress Level',
    
    // Alerts
    eScooterWarning: 'E-Scooter Warning',
    proximityAlert: 'Proximity Alert',
    weatherAlert: 'Weather Alert',
    
    // Voice Commands
    streetShield: 'Street Shield',
    whatIsMySafetyScore: 'what is my safety score',
    whereAmI: 'where am I',
    weatherCheck: 'weather check',
    
    // Buttons
    demoSafetyCheck: 'Demo: Safety Check',
    demoLocation: 'Demo: Location',
    demoWeather: 'Demo: Weather',
    
    // Settings
    voiceAlerts: 'Voice Alerts',
    enabled: 'Enabled',
    disabled: 'Disabled',
    
    // Status Messages
    locationPermissionDenied: 'Location permission denied',
    notificationPermissionDenied: 'Notification permission denied',
    gettingLocation: 'Getting your location...',
    
    // Emergency Status Panel
    emergencyModeActive: 'EMERGENCY MODE ACTIVE',
    emergencyContactsNotified: '{{count}} Emergency Contact(s) Alerted',
    liveLocationShared: 'Live location shared: {{coords}}',
    authoritiesNotified: 'Local authorities notified (simulated)',
    enhancedMonitoring: 'Enhanced monitoring every 5 seconds',
    contactsNotified: 'Contacts Notified:',
    deactivateEmergency: 'Deactivate Emergency',
    productionNote: 'Note: In production, contacts would receive SMS/push notifications with your real-time location and emergency details.',
  },
  
  es: { // Spanish
    appTitle: 'Escudo Callejero',
    analyzing: 'Analizando tu seguridad...',
    safetyScore: 'Puntuación de Seguridad',
    location: 'Ubicación',
    weather: 'Clima',
    temperature: 'Temperatura',
    
    veryLow: 'Riesgo Muy Bajo',
    low: 'Riesgo Bajo',
    moderate: 'Riesgo Moderado',
    high: 'Riesgo Alto',
    critical: 'Riesgo Crítico',
    
    emergency: 'Emergencia',
    emergencySetup: 'Configuración de Emergencia',
    emergencyContacts: 'Contactos de Emergencia',
    triggerWord: 'Palabra de Activación',
    setupEmergency: 'Configurar Emergencia',
    testEmergency: 'Probar Emergencia',
    demoTrigger: 'PRUEBA',
    emergencyActive: 'EMERGENCIA ACTIVA',
    contactsAlerted: 'CONTACTOS ALERTADOS',
    saveContacts: 'Guardar Contactos',
    cancel: 'Cancelar',
    
    emergencySetupComplete: 'Configuración de emergencia completa. Palabra clave: {{word}}. {{count}} contacto(s) agregado(s).',
    emergencyActivated: 'Emergencia activada. Alertando contactos ahora.',
    handsFreeActive: 'Modo manos libres activo. Escuchando {{word}}.',
    
    handsFreeMode: 'Modo Manos Libres',
    tapToStart: 'TOCA PARA INICIAR',
    active: 'ACTIVO',
    listening: 'ESCUCHANDO',
    voiceInfoReady: 'Info de voz lista. Di Escudo Callejero, luego tu pregunta.',
    
    cyclingMode: 'Modo Ciclismo',
    startCycling: 'Iniciar Ciclismo',
    stopCycling: 'Detener Ciclismo',
    cyclingActive: 'CICLISMO ACTIVO',
    cyclingSafetyMonitor: 'Monitor de Seguridad Ciclista',
    currentSpeed: 'Velocidad Actual',
    averageSpeed: 'Velocidad Promedio',
    safetyScoreLabel: 'Puntuación',
    roadType: 'Tipo de Vía',
    activeThreats: 'Amenazas Activas',
    riskLevel: 'Nivel de Riesgo',
    traffic: 'Tráfico',
    experience: 'Experiencia',
    
    healthMonitoring: 'Monitoreo de Salud',
    heartRate: 'Frecuencia Cardíaca',
    bloodOxygen: 'Oxígeno en Sangre',
    stressLevel: 'Nivel de Estrés',
    
    eScooterWarning: 'Advertencia E-Scooter',
    proximityAlert: 'Alerta de Proximidad',
    weatherAlert: 'Alerta Climática',
    
    demoSafetyCheck: 'Demo: Verificar Seguridad',
    demoLocation: 'Demo: Ubicación',
    demoWeather: 'Demo: Clima',
    
    voiceAlerts: 'Alertas de Voz',
    enabled: 'Activado',
    disabled: 'Desactivado',
    
    emergencyModeActive: 'MODO EMERGENCIA ACTIVO',
    emergencyContactsNotified: '{{count}} Contacto(s) de Emergencia Alertados',
    liveLocationShared: 'Ubicación compartida: {{coords}}',
    authoritiesNotified: 'Autoridades locales notificadas (simulado)',
    enhancedMonitoring: 'Monitoreo mejorado cada 5 segundos',
    contactsNotified: 'Contactos Notificados:',
    deactivateEmergency: 'Desactivar Emergencia',
    productionNote: 'Nota: En producción, los contactos recibirían SMS/notificaciones con tu ubicación en tiempo real.',
  },
  
  fr: { // French
    appTitle: 'Bouclier de Rue',
    analyzing: 'Analyse de votre sécurité...',
    safetyScore: 'Score de Sécurité',
    location: 'Localisation',
    weather: 'Météo',
    temperature: 'Température',
    
    veryLow: 'Risque Très Faible',
    low: 'Risque Faible',
    moderate: 'Risque Modéré',
    high: 'Risque Élevé',
    critical: 'Risque Critique',
    
    emergency: 'Urgence',
    emergencySetup: 'Configuration Urgence',
    emergencyContacts: 'Contacts d\'Urgence',
    triggerWord: 'Mot Déclencheur',
    setupEmergency: 'Configurer Urgence',
    testEmergency: 'Tester Urgence',
    demoTrigger: 'DÉMO',
    emergencyActive: 'URGENCE ACTIVE',
    contactsAlerted: 'CONTACTS ALERTÉS',
    saveContacts: 'Enregistrer Contacts',
    cancel: 'Annuler',
    
    emergencySetupComplete: 'Configuration d\'urgence terminée. Mot déclencheur: {{word}}. {{count}} contact(s) ajouté(s).',
    emergencyActivated: 'Urgence activée. Alerte des contacts maintenant.',
    handsFreeActive: 'Mode mains libres actif. Écoute de {{word}}.',
    
    handsFreeMode: 'Mode Mains Libres',
    tapToStart: 'APPUYER POUR COMMENCER',
    active: 'ACTIF',
    listening: 'ÉCOUTE',
    voiceInfoReady: 'Info vocale prête. Dites Bouclier de Rue, puis votre question.',
    
    cyclingMode: 'Mode Cyclisme',
    startCycling: 'Démarrer Cyclisme',
    stopCycling: 'Arrêter Cyclisme',
    cyclingActive: 'CYCLISME ACTIF',
    cyclingSafetyMonitor: 'Moniteur de Sécurité Cycliste',
    currentSpeed: 'Vitesse Actuelle',
    averageSpeed: 'Vitesse Moyenne',
    safetyScoreLabel: 'Score',
    roadType: 'Type de Route',
    activeThreats: 'Menaces Actives',
    riskLevel: 'Niveau de Risque',
    traffic: 'Trafic',
    experience: 'Expérience',
    
    healthMonitoring: 'Surveillance Santé',
    heartRate: 'Fréquence Cardiaque',
    bloodOxygen: 'Oxygène Sanguin',
    stressLevel: 'Niveau de Stress',
    
    eScooterWarning: 'Avertissement E-Scooter',
    proximityAlert: 'Alerte de Proximité',
    weatherAlert: 'Alerte Météo',
    
    demoSafetyCheck: 'Démo: Vérifier Sécurité',
    demoLocation: 'Démo: Localisation',
    demoWeather: 'Démo: Météo',
    
    voiceAlerts: 'Alertes Vocales',
    enabled: 'Activé',
    disabled: 'Désactivé',
    
    emergencyModeActive: 'MODE URGENCE ACTIF',
    emergencyContactsNotified: '{{count}} Contact(s) d\'Urgence Alertés',
    liveLocationShared: 'Position partagée: {{coords}}',
    authoritiesNotified: 'Autorités locales notifiées (simulé)',
    enhancedMonitoring: 'Surveillance renforcée toutes les 5 secondes',
    contactsNotified: 'Contacts Notifiés:',
    deactivateEmergency: 'Désactiver Urgence',
    productionNote: 'Note: En production, les contacts recevraient des SMS/notifications avec votre position en temps réel.',
  },
  
  de: { // German
    appTitle: 'Straßenschild',
    analyzing: 'Analysiere deine Sicherheit...',
    safetyScore: 'Sicherheitsbewertung',
    location: 'Standort',
    weather: 'Wetter',
    temperature: 'Temperatur',
    
    veryLow: 'Sehr Geringes Risiko',
    low: 'Geringes Risiko',
    moderate: 'Mäßiges Risiko',
    high: 'Hohes Risiko',
    critical: 'Kritisches Risiko',
    
    emergency: 'Notfall',
    emergencySetup: 'Notfall-Einrichtung',
    emergencyContacts: 'Notfallkontakte',
    triggerWord: 'Auslösewort',
    setupEmergency: 'Notfall Einrichten',
    testEmergency: 'Notfall Testen',
    demoTrigger: 'DEMO',
    emergencyActive: 'NOTFALL AKTIV',
    contactsAlerted: 'KONTAKTE BENACHRICHTIGT',
    saveContacts: 'Kontakte Speichern',
    cancel: 'Abbrechen',
    
    emergencySetupComplete: 'Notfall-Einrichtung abgeschlossen. Auslösewort: {{word}}. {{count}} Kontakt(e) hinzugefügt.',
    emergencyActivated: 'Notfall aktiviert. Kontakte werden jetzt benachrichtigt.',
    handsFreeActive: 'Freisprechmodus aktiv. Warte auf {{word}}.',
    
    handsFreeMode: 'Freisprechmodus',
    tapToStart: 'TIPPEN ZUM STARTEN',
    active: 'AKTIV',
    listening: 'ZUHÖREN',
    voiceInfoReady: 'Sprachinfo bereit. Sagen Sie Straßenschild, dann Ihre Frage.',
    
    cyclingMode: 'Radfahrmodus',
    startCycling: 'Radfahren Starten',
    stopCycling: 'Radfahren Beenden',
    cyclingActive: 'RADFAHREN AKTIV',
    cyclingSafetyMonitor: 'Radsicherheitsmonitor',
    currentSpeed: 'Aktuelle Geschwindigkeit',
    averageSpeed: 'Durchschnittsgeschwindigkeit',
    safetyScoreLabel: 'Bewertung',
    roadType: 'Straßentyp',
    activeThreats: 'Aktive Bedrohungen',
    riskLevel: 'Risikostufe',
    traffic: 'Verkehr',
    experience: 'Erfahrung',
    
    healthMonitoring: 'Gesundheitsüberwachung',
    heartRate: 'Herzfrequenz',
    bloodOxygen: 'Blutsauerstoff',
    stressLevel: 'Stressniveau',
    
    eScooterWarning: 'E-Scooter Warnung',
    proximityAlert: 'Näherungsalarm',
    weatherAlert: 'Wetteralarm',
    
    demoSafetyCheck: 'Demo: Sicherheitsprüfung',
    demoLocation: 'Demo: Standort',
    demoWeather: 'Demo: Wetter',
    
    voiceAlerts: 'Sprachalarme',
    enabled: 'Aktiviert',
    disabled: 'Deaktiviert',
    
    emergencyModeActive: 'NOTFALLMODUS AKTIV',
    emergencyContactsNotified: '{{count}} Notfallkontakt(e) Benachrichtigt',
    liveLocationShared: 'Live-Standort geteilt: {{coords}}',
    authoritiesNotified: 'Lokale Behörden benachrichtigt (simuliert)',
    enhancedMonitoring: 'Erweiterte Überwachung alle 5 Sekunden',
    contactsNotified: 'Kontakte Benachrichtigt:',
    deactivateEmergency: 'Notfall Deaktivieren',
    productionNote: 'Hinweis: In der Produktion würden Kontakte SMS/Push-Benachrichtigungen mit Ihrem Echtzeit-Standort erhalten.',
  },
  
  zh: { // Chinese (Simplified)
    appTitle: '街道护盾',
    analyzing: '正在分析您的安全...',
    safetyScore: '安全评分',
    location: '位置',
    weather: '天气',
    temperature: '温度',
    
    veryLow: '风险极低',
    low: '风险低',
    moderate: '风险中等',
    high: '风险高',
    critical: '风险危急',
    
    emergency: '紧急情况',
    emergencySetup: '紧急设置',
    emergencyContacts: '紧急联系人',
    triggerWord: '触发词',
    setupEmergency: '设置紧急',
    testEmergency: '测试紧急',
    demoTrigger: '演示',
    emergencyActive: '紧急状态激活',
    contactsAlerted: '联系人已通知',
    saveContacts: '保存联系人',
    cancel: '取消',
    
    emergencySetupComplete: '紧急设置完成。触发词：{{word}}。已添加{{count}}个联系人。',
    emergencyActivated: '紧急状态已激活。正在通知联系人。',
    handsFreeActive: '免提模式已激活。正在监听{{word}}。',
    
    handsFreeMode: '免提模式',
    tapToStart: '点击开始',
    active: '激活',
    listening: '监听中',
    voiceInfoReady: '语音信息已就绪。说出街道护盾，然后提出您的问题。',
    
    cyclingMode: '骑行模式',
    startCycling: '开始骑行',
    stopCycling: '停止骑行',
    cyclingActive: '骑行中',
    cyclingSafetyMonitor: '骑行安全监测',
    currentSpeed: '当前速度',
    averageSpeed: '平均速度',
    safetyScoreLabel: '评分',
    roadType: '道路类型',
    activeThreats: '活跃威胁',
    riskLevel: '风险等级',
    traffic: '交通',
    experience: '经验',
    
    healthMonitoring: '健康监测',
    heartRate: '心率',
    bloodOxygen: '血氧',
    stressLevel: '压力水平',
    
    eScooterWarning: '电动滑板车警告',
    proximityAlert: '邻近警报',
    weatherAlert: '天气警报',
    
    demoSafetyCheck: '演示：安全检查',
    demoLocation: '演示：位置',
    demoWeather: '演示：天气',
    
    voiceAlerts: '语音警报',
    enabled: '已启用',
    disabled: '已禁用',
    
    emergencyModeActive: '紧急模式激活',
    emergencyContactsNotified: '{{count}}个紧急联系人已通知',
    liveLocationShared: '实时位置已共享：{{coords}}',
    authoritiesNotified: '地方当局已通知（模拟）',
    enhancedMonitoring: '每5秒增强监测',
    contactsNotified: '已通知的联系人：',
    deactivateEmergency: '停用紧急',
    productionNote: '注意：在生产环境中，联系人将收到包含您实时位置的短信/推送通知。',
  },
});

// Set the locale based on the device language
i18n.locale = Localization.getLocales()[0]?.languageCode || 'en';

// Enable fallback to English if translation is missing
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
