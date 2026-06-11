# NEXTJS Academic Level Link/Delete — Live QA

**Status:** COMPLETED
**Base:** https://school.raqeem.ma
**DB:** school
**Date:** 2026-06-11T20:42:49.067Z

## Pass (14)
- P1 shows enabled with can_link=false
- link-reference returns already_linked for P1
- DELETE P1 blocked with level_in_use
- level_in_use details include classes count
- DELETE in-use level returns 409
- readiness OK after mutations
- i18n ar keys present
- i18n fr keys present
- i18n en keys present
- i18n es keys present
- i18n ar level UI strings clean
- i18n fr level UI strings clean
- i18n en level UI strings clean
- i18n es level UI strings clean

## Fail (0)
- none

## Skip (1)
- could not obtain empty school level for delete QA

## API snapshots
```json
{
  "link": {
    "p1": {
      "id": 4,
      "link_status": "enabled",
      "can_link": false,
      "school_level_id": 77,
      "enabled": true
    },
    "alreadyLinkedProbe": {
      "status": 200,
      "action": "already_linked",
      "error": null
    }
  },
  "delete": {
    "p1Blocked": {
      "status": 409,
      "error": "level_in_use",
      "details": {
        "classes": 1,
        "subjects": 0,
        "tracks": 0,
        "students": 0,
        "enrollments": 0,
        "assignments": 0,
        "timetable_slots": 0,
        "exams": 0
      }
    },
    "inUseLevel": {
      "id": 77,
      "status": 409,
      "error": "level_in_use",
      "details": {
        "classes": 1,
        "subjects": 0,
        "tracks": 0,
        "students": 0,
        "enrollments": 0,
        "assignments": 0,
        "timetable_slots": 0,
        "exams": 0
      }
    },
    "enableForQa": {
      "refId": 10,
      "code": "M1",
      "status": 409,
      "success": false,
      "error": "duplicate_record"
    }
  },
  "readiness": {
    "status": 200,
    "success": true
  }
}
```
