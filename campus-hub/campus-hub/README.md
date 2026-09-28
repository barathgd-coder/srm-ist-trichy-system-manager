# Smart Campus: Floor Manager + Attendance

One site. The shell and UI come from the Smart Floor Manager (dark glass, cyan accents, 3D campus twin). The SRM attendance app lives inside it as the ATTENDANCE tab, restyled with the same tokens.

Run: open `index.html` (needs internet for three.js and fonts), or `npx serve .`. Deploy on Vercel as a static site.

## How they connect
- `attendance/timetable.js` holds the real SRM timetable, shared by both sides.
- The map's "Today" list, "Next class" countdown and room availability are built from the section chosen in Attendance > Profile.
- Rooms 518, 519, 211, 225, 227, 411, 625, LAB-107, LAB-108 and TB-106 are real rooms on the map. Their floors are set in `REAL` in `index.html`; change them if the building differs.
- All other rooms and the attendance figures are still sample data.
