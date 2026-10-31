import json

data = json.load(open('CrunchWeek_StarterPack/data/cit_public.json', encoding='utf-8'))
sched = json.load(open('exports/schedule.json', encoding='utf-8'))
courses = {c['id']: c for c in data['courses']}
fac_map = {f['id']: f['name'] for f in data['faculty']}
s_meta = {s['id']: s for s in data['sessions']}

sessions_full = []
for s in sched['sessions']:
    sid = s['session_id']
    meta = s_meta.get(sid, {})
    cid = meta.get('course_id', sid)
    sessions_full.append({
        'id': sid,
        'course_id': cid,
        'name': cid + (' (Lab)' if meta.get('kind') == 'lab' else ' Lecture'),
        'kind': meta.get('kind', 'lecture'),
        'day': s['day'],
        'start_period': s['start_period'],
        'duration': meta.get('duration', 1),
        'room': s['room_id'],
        'faculty_id': meta.get('faculty_id'),
        'faculty_name': fac_map.get(meta.get('faculty_id'), meta.get('faculty_id')),
        'groups': meta.get('groups', []),
        'basket_slot': meta.get('basket_slot')
    })

bookings_full = []
b_meta = {b['id']: b for b in data['booking_requests']}
for b in sched['fest_week']['bookings']:
    rid = b['request_id']
    meta = b_meta.get(rid, {})
    win = meta.get('windows', [{}])[0] if meta.get('windows') else {}
    req_str = f"{win.get('day', '')} P{win.get('from_period', '')}–P{win.get('to_period', '')}" if win else "—"
    ass_str = f"{b.get('room_id', '—')} · {b.get('day', '')} P{b.get('start_period', '')}–P{b.get('end_period', '')}" if b.get('room_id') else "—"
    status_fmt = "Approved" if b["status"] == "approved" else ("Alternative Offered" if b["status"] == "alternative_offered" else "Rejected")
    bookings_full.append({
        'id': rid,
        'title': meta.get('title', rid),
        'requester': meta.get('requester', 'Club'),
        'role': meta.get('role', 'club'),
        'status': status_fmt,
        'requested_slot': req_str,
        'assigned_slot': ass_str,
        'reason': b.get('reason', '')
    })

exams_full = []
ex_meta = {e['id']: e for e in data['exams']}
for e in sched['exams']:
    eid = e['exam_id']
    m = ex_meta.get(eid, {})
    exams_full.append({
        'id': eid,
        'day': e['day'],
        'session': e['session'],
        'rooms': ' · '.join(e['rooms']),
        'groups': ', '.join(m.get('groups', [])),
        'name': eid.replace('EX-', '')
    })

pack = {
    'groups': [{'id': g['id'], 'name': g['name']} for g in data['student_groups']],
    'faculty': [{'id': f['id'], 'name': f['name'], 'dept': f['department']} for f in data['faculty']],
    'rooms': [{'id': r['id'], 'name': r['name'], 'type': r['type'], 'cap': r['capacity']} for r in data['rooms']],
    'sessions': sessions_full,
    'bookings': bookings_full,
    'exams': exams_full
}

with open('frontend/lib/campus-data.json', 'w', encoding='utf-8') as f:
    json.dump(pack, f, indent=2)

print('Successfully generated frontend/lib/campus-data.json!')

