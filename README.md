# Pomodoro Focus Timer

A free Pomodoro focus timer. Focus for 25 minutes, take a 5-minute break, and after 4 sessions take a longer break. Track your daily focus time, sessions, streak and the last 7 days.

**Live demo:** https://vikaskapuganti.github.io/pomodoro-timer/

## Features

- Focus, short break and long break timers (25 / 5 / 15 minutes by default, all adjustable)
- Long break automatically after every 4 focus sessions (adjustable), with dots showing your progress
- Big circular timer, with Start, Pause, Resume, Reset and Skip
- “What are you working on?” label saved with each session
- A soft chime and an optional browser notification when time is up
- The countdown shows in the browser tab title
- Today’s focus time, sessions and day streak
- A 7-day chart of focus minutes and a log of today’s sessions
- Option to start the next timer automatically
- Press the Space bar to start or pause
- Turns green during breaks; light and dark mode
- Saved on your device, with no login or sign-up

## How it works

- The timer saves the exact time it should end, instead of counting down second by second, so it stays accurate even if the tab sleeps or the phone locks.
- Only finished focus sessions count in your stats. Skipped sessions don’t.
- **Day streak:** consecutive days with at least one finished focus session.
- The chime is made with the Web Audio API, so there are no sound files.

## Built with

HTML, CSS and JavaScript. No frameworks and no libraries. Data is stored with the browser’s localStorage.

## Run it yourself

Download the files and open `index.html` in any browser.

---

Built by Vikas Kapuganti
