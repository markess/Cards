# Cards

### Modern flashcard learning — private, offline-first, and free forever.

**Cards** is a high-performance web application for **active recall and spaced repetition**.

It combines five interactive study modes with offline-first reliability and seamless synchronization with **Google Drive & Google Sheets** — without subscriptions, advertising, tracking, or a dedicated backend.

> **Your cards. Your data. Your Google Drive.**

---

## ✨ Features

### 🧠 5 Interactive Study Modes

Learn the way that works best for you:

* **Flashcards** — classic active recall
* **Write** — recall answers by typing them
* **Match** — connect terms with their definitions
* **Test** — test your knowledge with generated questions
* **Review** — reinforce knowledge using spaced repetition

All five modes are **fully unlocked and free**.

---

### 🔒 Privacy First

Your learning data belongs to you.

Cards stores your flashcards and study notes **exclusively in your own Google Drive account**.

There is no central database containing your cards.

* 🚫 No tracking
* 🚫 No analytics telemetry
* 🚫 No data harvesting
* 🚫 No banner ads
* 🚫 No selling or sharing of your learning data

The application requests only the **minimum Google permissions required** to work with the spreadsheet files it creates.

---

### ⚡ Offline First

Cards is designed to keep working even when your internet connection doesn't.

* Local-first application architecture
* Fast response without unnecessary network requests
* Study your cards offline
* Synchronize your data when connectivity returns

Your study session shouldn't stop just because your Wi-Fi does.

---

### ☁️ Google Drive & Sheets Sync

Your data stays in your own Google ecosystem.

Cards uses **Google Drive and Google Sheets** as the user's personal data store, giving you:

* Full ownership of your flashcards
* Automatic synchronization
* Access to your data outside the application
* Easy backup and export
* No proprietary lock-in

You can always take your data with you.

---

## 💸 Free Forever

Cards is designed without subscriptions or artificial limitations.

* ✅ All **5 study modes** are free
* ✅ No card-count limits
* ✅ No paywalls
* ✅ No premium tiers
* ✅ No advertising
* ✅ Export your data at any time
* ✅ Hosted on free **GitHub Pages** infrastructure
* ✅ Authentication uses the **Firebase free tier**

There is no business model based on restricting your learning experience.

---

## 🏗️ Architecture

Cards follows a deliberately simple architecture:

```text
                    ┌─────────────────────┐
                    │       Cards         │
                    │    Web Application  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │   Browser   │  │   Firebase  │  │ Google APIs │
       │ Local Data  │  │    Auth     │  │             │
       └─────────────┘  └─────────────┘  └──────┬──────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │  User's Google      │
                                      │  Drive / Sheets     │
                                      └─────────────────────┘
```

### No application backend

Cards does not require a dedicated application server or database.

The application is delivered as a static web application, while user data remains in the user's own Google Drive.

This keeps the infrastructure simple, reduces operational costs, and minimizes the amount of data that needs to leave the user's device.

---

## 🔐 Data Ownership

A fundamental design principle of Cards is:

> **The application should not own your learning data. You should.**

Your flashcards and notes are stored in your Google Drive rather than in a proprietary Cards database.

This also means that your data remains accessible independently of the application.

---

## 🚀 Why Cards?

Traditional flashcard platforms often combine learning tools with:

* subscriptions,
* proprietary cloud storage,
* advertising,
* tracking,
* account-dependent data,
* artificial usage limits.

Cards takes a different approach:

**A powerful learning tool with minimal infrastructure and maximum data ownership.**

---

## 📋 Core Principles

| Principle                     | Cards  |
| ----------------------------- | ------ |
| Subscriptions                 | ❌ None |
| Paywalls                      | ❌ None |
| Card limits                   | ❌ None |
| Banner ads                    | ❌ None |
| Analytics tracking            | ❌ None |
| Dedicated application backend | ❌ None |
| User-owned data               | ✅      |
| Google Drive storage          | ✅      |
| Offline-first                 | ✅      |
| Active recall                 | ✅      |
| Spaced repetition             | ✅      |
| Export freedom                | ✅      |

---

## 🛠️ Technology

Cards is built around a lightweight web architecture designed for:

* High performance
* Static hosting
* Offline-first operation
* Google Drive & Sheets integration
* Secure authentication
* Minimal infrastructure
* Long-term maintainability

---

## 📄 License

*Add your license here.*

---

## ❤️ Philosophy

Learning tools should help people learn — not turn their knowledge into a subscription.

**Cards is built to be fast, private, free, and yours.**

