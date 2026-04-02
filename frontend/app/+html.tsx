import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary SEO Meta Tags */}
        <title>Street Shield - Personal Safety Awareness App | Live Location Sharing & Smart Alerts</title>
        <meta
          name="description"
          content="Street Shield is your AI-powered personal safety awareness companion. Quick alerts to trusted contacts, live location sharing, and real-time environmental awareness. Stay informed and connected walking alone, running at night, or travelling. Trusted by pedestrians, runners, cyclists, students, and families across the UK and worldwide."
        />
        <meta
          name="keywords"
          content="personal safety app, safety awareness app, live location sharing, safety tracker, walking safety, running safety app, pedestrian safety, cycling safety, student safety app, campus safety, family safety tracker, lone worker safety, travel safety app, UK safety app, night safety, women safety app, personal alert app, silent alert, share location for safety, real-time tracking, awareness scoring, e-scooter warning, headphone safety, Street Shield"
        />
        <meta name="author" content="Street Shield" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://streetshield.app" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://streetshield.app" />
        <meta property="og:title" content="Street Shield - AI Personal Safety Awareness App" />
        <meta
          property="og:description"
          content="Feel uneasy? Street Shield has your back. Quick alerts to trusted contacts, live location sharing, voice-activated commands, and AI awareness scoring. The personal safety app for walking, running, cycling & travelling. Download free."
        />
        <meta property="og:site_name" content="Street Shield" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="de_DE" />
        <meta property="og:locale:alternate" content="zh_CN" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Street Shield - Personal Safety Awareness | Smart Alerts & Live Sharing" />
        <meta
          name="twitter:description"
          content="AI-powered safety awareness for pedestrians, runners & cyclists. Quick alerts, live tracking, environmental awareness. Stay informed walking alone at night."
        />

        {/* App-Specific Meta */}
        <meta name="application-name" content="Street Shield" />
        <meta name="apple-mobile-web-app-title" content="Street Shield" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="msapplication-TileColor" content="#0a0a1a" />

        {/* Geo Targeting */}
        <meta name="geo.region" content="GB" />
        <meta name="geo.placename" content="United Kingdom" />

        {/* Schema.org JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Street Shield',
              applicationCategory: 'LifestyleApplication',
              applicationSubCategory: 'Personal Safety',
              operatingSystem: 'iOS, Android, Web',
              description:
                'AI-powered personal safety awareness app with quick alerts to trusted contacts, live location sharing, real-time environmental awareness, cycling safety mode, and voice-activated commands. Designed for pedestrians, runners, cyclists, students, and families.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'GBP',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1250',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                'Quick alert notifications to trusted contacts',
                'Live location sharing with contacts',
                'AI-powered environmental awareness',
                'Electric scooter proximity warnings',
                'Voice-activated safety commands',
                'Cycling safety mode',
                'Activity insights and movement tracking',
                'Multi-language support',
                'Offline safety mode',
                'Haptic feedback alerts',
              ],
              keywords:
                'personal safety, safety awareness, quick alerts, live location, walking safety, running safety, cycling safety, student safety, family tracker, UK safety app',
              inLanguage: ['en', 'es', 'fr', 'de', 'zh'],
              author: {
                '@type': 'Organization',
                name: 'Street Shield',
              },
            }),
          }}
        />

        {/* FAQ Schema for Safety-Intent Searches */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What should I do if someone is following me?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Open Street Shield and tap the quick alert button. Your live location will be instantly shared with your trusted contacts. The app also provides voice-activated commands so you can send alerts hands-free.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the best personal safety app for walking alone at night?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Street Shield is designed specifically for pedestrian safety awareness. It provides real-time AI environmental scoring, proximity alerts for silent electric scooters, quick alerts to trusted contacts with one tap, live location sharing, and voice-activated commands — all designed to keep you aware and connected while walking alone.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How can I share my live location for safety while running?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Street Shield automatically shares your live location with your chosen trusted contacts when you activate the safety monitor. It tracks your route in real-time and will notify contacts if you stop moving unexpectedly.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is there a safety alert app that works without making a phone call?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes — Street Shield sends silent notifications to your trusted contacts. You can trigger a quick alert with a button tap, voice command, or the app can notify contacts based on activity patterns.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What app alerts my contacts if I stop moving?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Street Shield monitors your movement and activity data. If it detects that you have stopped unexpectedly or shows unusual activity patterns, it can automatically notify your trusted contacts with your location. Note: This is an awareness tool, not a substitute for professional services.',
                  },
                },
              ],
            }),
          }}
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #0a0a1a;
  color: #fff;
}
`;
