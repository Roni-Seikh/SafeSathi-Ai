# SafeSathi — Entity-Relationship Diagram

MongoDB is document-based, so these are logical relationships expressed via
`ObjectId` references (Mongoose `ref`), not enforced foreign keys. Full
field lists live in `backend/src/models/*.model.ts` — this diagram shows
primary/foreign keys and the fields that matter for understanding the
relationships.

```mermaid
erDiagram
    USERS ||--o{ EMERGENCY_CONTACTS : "has up to 5"
    USERS ||--o{ SOS_LOGS : triggers
    USERS ||--o{ LOCATIONS : generates
    USERS ||--o{ VOICE_LOGS : generates
    USERS ||--o{ SENSOR_LOGS : generates
    USERS ||--o{ REPORTS : files
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ ROUTES : requests
    USERS ||--o{ CHAT_HISTORY : converses

    SOS_LOGS ||--o{ LOCATIONS : "tracked by"
    SOS_LOGS |o--o| VOICE_LOGS : "may originate from"
    SOS_LOGS |o--o| SENSOR_LOGS : "may originate from"
    SOS_LOGS |o--o| REPORTS : "may generate evidence report"
    SOS_LOGS }o--o{ EMERGENCY_CONTACTS : "notifies (notifiedContacts[])"

    REPORTS }o--|| HEATMAPS : "aggregates into (by zone)"
    SOS_LOGS }o--|| HEATMAPS : "aggregates into (by zone)"
    ROUTES }o--o{ HEATMAPS : "crosses (riskZonesCrossed[])"

    ADMINS ||--o{ REPORTS : verifies
    ADMINS ||--o{ HEATMAPS : "recalculates"

    USERS {
        ObjectId _id PK
        string firebaseUid UK
        string name
        string email UK
        string phone UK
        string bloodGroup
        string preferredLanguage
        GeoJSONPoint lastKnownLocation
        boolean isActive
    }

    EMERGENCY_CONTACTS {
        ObjectId _id PK
        ObjectId userId FK
        string name
        string relationship
        string phone
        number priority "1-5, max 5 per user"
        boolean isPrimary
    }

    SOS_LOGS {
        ObjectId _id PK
        ObjectId userId FK
        string triggerType "manual|voice_keyword|motion|tone|admin"
        string status "active|resolved|false_alarm|cancelled"
        GeoJSONPoint location
        number batteryLevel
        number safeScoreAtTrigger
        ObjectId voiceLogId FK
        ObjectId sensorLogId FK
        ObjectId evidenceReportId FK
        date triggeredAt
    }

    LOCATIONS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId sosLogId FK "nullable"
        GeoJSONPoint coordinates
        boolean isSharing
        date recordedAt
    }

    VOICE_LOGS {
        ObjectId _id PK
        ObjectId userId FK
        string detectedKeyword
        string language "en|hi|bn"
        number keywordConfidence
        number screamProbability
        boolean triggeredSOS
        ObjectId sosLogId FK
    }

    SENSOR_LOGS {
        ObjectId _id PK
        ObjectId userId FK
        string eventType "running|phone_snatch|violent_movement|sudden_fall|normal"
        number confidenceScore
        boolean triggeredSOS
        ObjectId sosLogId FK
    }

    REPORTS {
        ObjectId _id PK
        ObjectId userId FK "nullable if anonymous"
        string type
        string status "pending|verified|rejected|resolved"
        string severity
        GeoJSONPoint location
        boolean isAnonymous
        ObjectId verifiedBy FK
    }

    HEATMAPS {
        ObjectId _id PK
        string zoneId UK
        GeoJSONPoint center
        number radiusMeters
        string riskLevel "green|yellow|red"
        number riskScore
        string dataSource
    }

    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId userId FK
        string type
        string channel
        boolean isRead
    }

    ROUTES {
        ObjectId _id PK
        ObjectId userId FK
        GeoJSONPoint origin
        GeoJSONPoint destination
        GeoJSONLineString routeGeometry
        number safeScore
    }

    CHAT_HISTORY {
        ObjectId _id PK
        ObjectId userId FK
        string sessionId
        string role "user|assistant"
        string intent
    }

    ADMINS {
        ObjectId _id PK
        string email UK
        string passwordHash
        string role "super_admin|moderator|analyst"
        boolean isActive
    }
```

## Notes on Relationships

- **EmergencyContacts (max 5 per user)** — capped at the service layer
  (not the schema layer), because enforcing "at most N" requires a count
  query against existing documents, which belongs in
  `EmergencyContactService.addContact()`, not in the Mongoose schema.
- **SOSLog ↔ VoiceLog/SensorLog** is optional-to-optional: a manually
  triggered SOS has neither; an AI-triggered SOS has exactly one.
- **Report → Heatmap** and **SOSLog → Heatmap** are *aggregation*
  relationships, not direct foreign keys — the `HeatmapService` (Phase 6)
  periodically recomputes each zone's `riskScore`/`riskLevel` from the
  reports and SOS logs that fall within it, rather than each `Report`
  storing a live `heatmapId`.
- **Route → Heatmap (riskZonesCrossed)** records which zones a *computed*
  route passed through, for explainability ("this route was scored lower
  because it crosses 2 red zones").
