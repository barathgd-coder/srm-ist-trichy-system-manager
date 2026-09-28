# SRM Attendance

Apple-inspired college attendance app for SRM IST Tiruchirappalli (odd semester 2026-27). Plain HTML, CSS and JS, no build step.

## Run in VS Code
1. Unzip and open the folder in VS Code.
2. Install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server". (Double-clicking `index.html` also works.)

## Files
- `index.html` page shell and navigation
- `style.css` design tokens (colors, radii, shadows) at the top, then components
- `app.js` timetable data (`SECTIONS`), sample attendance generator, views and routing
- `assets/` SRM logo and seal

## Things to edit
- Semester dates and holidays: `SEM_START`, `SEM_END`, `HOLIDAYS` near the top of the helpers section in `app.js`.
- Sample data: attendance is generated in `build()` in `app.js`. Replace it with real records (`{date:'2026-09-28', i:periodIndex, key:'A', s:'P'|'L'|'A'}`) to connect a real source.
- Add a section: copy an entry in `SECTIONS` and change its subjects and timetable grid (`.` = free period).
