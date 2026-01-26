# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler
The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

The in-app notifications bell is backed by a Supabase notifications table.
If that table does not exist, cross-user notifications (admin/coach -> student) cannot work.

- Run the SQL in supabase-schema.sql in the Supabase SQL Editor.
- Run the SQL in supabase-projects.sql so projects/submissions are stored in Supabase (not browser localStorage).
- Enable Realtime for public.notifications:
	- Option A (SQL): run the REALTIME (Supabase Realtime) section near the bottom of supabase-schema.sql.
	- Option B (UI): Database -> Replication -> enable Realtime for notifications.

### Session notifications

The schema includes a trigger: when a row is inserted into session_attendees, a notification is created automatically for that student.
This ensures students get notified even if sessions are created outside the app.
