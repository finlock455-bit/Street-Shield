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
    
    // Quick Alert (formerly Emergency)
    emergency: 'Quick Alert',
    emergencySetup: 'Safety Alert Setup',
    emergencyContacts: 'Trusted Contacts',
    triggerWord: 'Trigger Word',
    setupEmergency: 'Setup Alert',
    testEmergency: 'Test Alert',
    demoTrigger: 'DEMO TRIGGER',
    emergencyActive: 'ALERT ACTIVE',
    contactsAlerted: 'CONTACTS ALERTED',
    saveContacts: 'Save Contacts',
    cancel: 'Cancel',
    
    // Alert Messages (formerly Emergency Messages)
    emergencySetupComplete: 'Safety alert setup complete. Trigger word: {{word}}. {{count}} contact(s) added.',
    emergencyActivated: 'Alert activated. Notifying contacts now.',
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
    
    // Activity Insights (formerly Health)
    healthMonitoring: 'Activity Insights',
    heartRate: 'Rhythm',
    bloodOxygen: 'Energy',
    stressLevel: 'Alertness',
    
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
    
    // Alert Status Panel (formerly Emergency Status Panel)
    emergencyModeActive: 'ALERT MODE ACTIVE',
    emergencyContactsNotified: '{{count}} Trusted Contact(s) Notified',
    liveLocationShared: 'Live location shared: {{coords}}',
    authoritiesNotified: 'Location data captured',
    enhancedMonitoring: 'Enhanced monitoring every 5 seconds',
    contactsNotified: 'Contacts Notified:',
    deactivateEmergency: 'Deactivate Alert',
    productionNote: 'Note: In production, contacts would receive SMS/push notifications with your real-time location.',

    // Disclaimers
    disclaimer: 'This is a safety awareness tool, not a replacement for professional services. In a real crisis, always call your local authorities directly.',
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
    
    emergency: 'Alerta Rápida',
    emergencySetup: 'Configuración de Alerta',
    emergencyContacts: 'Contactos de Confianza',
    triggerWord: 'Palabra de Activación',
    setupEmergency: 'Configurar Alerta',
    testEmergency: 'Probar Alerta',
    demoTrigger: 'PRUEBA',
    emergencyActive: 'ALERTA ACTIVA',
    contactsAlerted: 'CONTACTOS ALERTADOS',
    saveContacts: 'Guardar Contactos',
    cancel: 'Cancelar',
    
    emergencySetupComplete: 'Configuración de alerta completa. Palabra clave: {{word}}. {{count}} contacto(s) agregado(s).',
    emergencyActivated: 'Alerta activada. Notificando contactos ahora.',
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
    
    healthMonitoring: 'Información de Actividad',
    heartRate: 'Ritmo',
    bloodOxygen: 'Energía',
    stressLevel: 'Alerta',
    
    eScooterWarning: 'Advertencia E-Scooter',
    proximityAlert: 'Alerta de Proximidad',
    weatherAlert: 'Alerta Climática',
    
    demoSafetyCheck: 'Demo: Verificar Seguridad',
    demoLocation: 'Demo: Ubicación',
    demoWeather: 'Demo: Clima',
    
    voiceAlerts: 'Alertas de Voz',
    enabled: 'Activado',
    disabled: 'Desactivado',
    
    emergencyModeActive: 'MODO ALERTA ACTIVO',
    emergencyContactsNotified: '{{count}} Contacto(s) de Confianza Notificados',
    liveLocationShared: 'Ubicación compartida: {{coords}}',
    authoritiesNotified: 'Datos de ubicación capturados',
    enhancedMonitoring: 'Monitoreo mejorado cada 5 segundos',
    contactsNotified: 'Contactos Notificados:',
    deactivateEmergency: 'Desactivar Alerta',
    productionNote: 'Nota: En producción, los contactos recibirían SMS/notificaciones con tu ubicación en tiempo real.',
    disclaimer: 'Esta es una herramienta de conciencia de seguridad, no un reemplazo de servicios profesionales. En una crisis real, siempre llame a las autoridades locales directamente.',
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
    
    emergency: 'Alerte Rapide',
    emergencySetup: 'Configuration Alerte',
    emergencyContacts: 'Contacts de Confiance',
    triggerWord: 'Mot Déclencheur',
    setupEmergency: 'Configurer Alerte',
    testEmergency: 'Tester Alerte',
    demoTrigger: 'DÉMO',
    emergencyActive: 'ALERTE ACTIVE',
    contactsAlerted: 'CONTACTS ALERTÉS',
    saveContacts: 'Enregistrer Contacts',
    cancel: 'Annuler',
    
    emergencySetupComplete: 'Configuration d\'alerte terminée. Mot déclencheur: {{word}}. {{count}} contact(s) ajouté(s).',
    emergencyActivated: 'Alerte activée. Notification des contacts maintenant.',
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
    
    healthMonitoring: 'Aperçu d\'Activité',
    heartRate: 'Rythme',
    bloodOxygen: 'Énergie',
    stressLevel: 'Vigilance',
    
    eScooterWarning: 'Avertissement E-Scooter',
    proximityAlert: 'Alerte de Proximité',
    weatherAlert: 'Alerte Météo',
    
    demoSafetyCheck: 'Démo: Vérifier Sécurité',
    demoLocation: 'Démo: Localisation',
    demoWeather: 'Démo: Météo',
    
    voiceAlerts: 'Alertes Vocales',
    enabled: 'Activé',
    disabled: 'Désactivé',
    
    emergencyModeActive: 'MODE ALERTE ACTIF',
    emergencyContactsNotified: '{{count}} Contact(s) de Confiance Alertés',
    liveLocationShared: 'Position partagée: {{coords}}',
    authoritiesNotified: 'Données de localisation capturées',
    enhancedMonitoring: 'Surveillance renforcée toutes les 5 secondes',
    contactsNotified: 'Contacts Notifiés:',
    deactivateEmergency: 'Désactiver Alerte',
    productionNote: 'Note: En production, les contacts recevraient des SMS/notifications avec votre position en temps réel.',
    disclaimer: 'Ceci est un outil de sensibilisation à la sécurité, pas un remplacement des services professionnels. En cas de crise réelle, appelez toujours les autorités locales directement.',
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
    
    emergency: 'Schnellalarm',
    emergencySetup: 'Alarm-Einrichtung',
    emergencyContacts: 'Vertrauenspersonen',
    triggerWord: 'Auslösewort',
    setupEmergency: 'Alarm Einrichten',
    testEmergency: 'Alarm Testen',
    demoTrigger: 'DEMO',
    emergencyActive: 'ALARM AKTIV',
    contactsAlerted: 'KONTAKTE BENACHRICHTIGT',
    saveContacts: 'Kontakte Speichern',
    cancel: 'Abbrechen',
    
    emergencySetupComplete: 'Alarm-Einrichtung abgeschlossen. Auslösewort: {{word}}. {{count}} Kontakt(e) hinzugefügt.',
    emergencyActivated: 'Alarm aktiviert. Kontakte werden jetzt benachrichtigt.',
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
    
    healthMonitoring: 'Aktivitätseinblicke',
    heartRate: 'Rhythmus',
    bloodOxygen: 'Energie',
    stressLevel: 'Wachsamkeit',
    
    eScooterWarning: 'E-Scooter Warnung',
    proximityAlert: 'Näherungsalarm',
    weatherAlert: 'Wetteralarm',
    
    demoSafetyCheck: 'Demo: Sicherheitsprüfung',
    demoLocation: 'Demo: Standort',
    demoWeather: 'Demo: Wetter',
    
    voiceAlerts: 'Sprachalarme',
    enabled: 'Aktiviert',
    disabled: 'Deaktiviert',
    
    emergencyModeActive: 'ALARMMODUS AKTIV',
    emergencyContactsNotified: '{{count}} Vertrauensperson(en) Benachrichtigt',
    liveLocationShared: 'Live-Standort geteilt: {{coords}}',
    authoritiesNotified: 'Standortdaten erfasst',
    enhancedMonitoring: 'Erweiterte Überwachung alle 5 Sekunden',
    contactsNotified: 'Kontakte Benachrichtigt:',
    deactivateEmergency: 'Alarm Deaktivieren',
    productionNote: 'Hinweis: In der Produktion würden Kontakte SMS/Push-Benachrichtigungen mit Ihrem Echtzeit-Standort erhalten.',
    disclaimer: 'Dies ist ein Sicherheitsbewusstseinstool, kein Ersatz für professionelle Dienste. Rufen Sie im Notfall immer direkt die örtlichen Behörden an.',
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
    
    emergency: '快速提醒',
    emergencySetup: '安全提醒设置',
    emergencyContacts: '信任联系人',
    triggerWord: '触发词',
    setupEmergency: '设置提醒',
    testEmergency: '测试提醒',
    demoTrigger: '演示',
    emergencyActive: '提醒已激活',
    contactsAlerted: '联系人已通知',
    saveContacts: '保存联系人',
    cancel: '取消',
    
    emergencySetupComplete: '安全提醒设置完成。触发词：{{word}}。已添加{{count}}个联系人。',
    emergencyActivated: '提醒已激活。正在通知联系人。',
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
    
    healthMonitoring: '活动洞察',
    heartRate: '节奏',
    bloodOxygen: '能量',
    stressLevel: '警觉度',
    
    eScooterWarning: '电动滑板车警告',
    proximityAlert: '邻近警报',
    weatherAlert: '天气警报',
    
    demoSafetyCheck: '演示：安全检查',
    demoLocation: '演示：位置',
    demoWeather: '演示：天气',
    
    voiceAlerts: '语音警报',
    enabled: '已启用',
    disabled: '已禁用',
    
    emergencyModeActive: '提醒模式激活',
    emergencyContactsNotified: '{{count}}个信任联系人已通知',
    liveLocationShared: '实时位置已共享：{{coords}}',
    authoritiesNotified: '位置数据已记录',
    enhancedMonitoring: '每5秒增强监测',
    contactsNotified: '已通知的联系人：',
    deactivateEmergency: '停用提醒',
    productionNote: '注意：在生产环境中，联系人将收到包含您实时位置的短信/推送通知。',
    disclaimer: '这是一个安全意识工具，不能替代专业服务。在真正的危机中，请直接拨打当地紧急服务电话。',
  },
});

// Set the locale based on the device language
i18n.locale = Localization.getLocales()[0]?.languageCode || 'en';

// Enable fallback to English if translation is missing
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
