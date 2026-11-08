# Private students and shared group homework

Teachers open a course, then **Students, schedules and assignments**. Each enrolled student has a separate card showing the two confirmed appointment snapshots and the assignments addressed to that student. Group cards share course assignments and show each student's own submission status, including missing or draft work.

Creating private homework requires an enrolled recipient. Group homework has no individual recipient. The database trigger enforces this rule, the student server queries filter recipients, and restrictive RLS/storage policies protect private homework and resources. Atomic submission writes reject the wrong recipient, including a direct service-role write through the application RPC.

Existing private homework is assigned automatically only when its course has exactly one enrolled student. The migration stops on ambiguous legacy homework so it cannot accidentally become shared.

A private course supports multiple students. Confirmed and pending reservations are unique per student/course. Available slots exclude confirmed or unexpired held times, including overlapping times in another course taught by the same instructor. Teacher row locks serialize competing reservations. Expired holds do not block slots; PayTabs snapshot and hold protections remain in force.

Live lesson creation mounts only the meeting fields; recorded video inputs are removed when switching to live. The server still requires a meeting URL for live lessons and a valid video source for recorded lessons.

Validation: unit tests cover lesson type switching and server creation; SQL regressions cover five distinct private reservations, individual homework/RLS/storage isolation, required recipients, shared group homework, and an actual two-session race for a teacher's overlapping slots across courses. Existing payment, chat, assignment and renewal suites remain included in the database runner.

Deployed browser verification used one temporary instructor and five student accounts with distinct confirmed schedules. Verified recipient preselection and assignment creation, all five student lists, denied direct access to another recipient's homework, submission updates in the teacher roster, shared group submitted/late/missing states, Arabic/English, a 390px viewport without overflow, and successful Zoom lesson creation without a YouTube field. Temporary courses/accounts were removed afterward.
