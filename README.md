<div align="center">

# AGAPAY

### Workforce Development and Career Management System

**A web-based job portal connecting graduates, jobseekers, and employers through a centralized recruitment platform.**

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-2e66a6?style=flat-square)](https://www.mongodb.com/mern-stack)
![React](https://img.shields.io/badge/Frontend-React-149eca?style=flat-square)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square)
![Status](https://img.shields.io/badge/Project-Academic%20Capstone-2e66a6?style=flat-square)

[Overview](#overview) · [Features](#key-features) · [Technology](#technology-stack) · [Setup](#getting-started) · [Security](#security-and-access-control)

</div>

---

## Overview

**AGAPAY** is a workforce development and career management web application created as an academic capstone project for **PHINMA Araullo University**. It brings job discovery, applications, employer recruitment, and administrative oversight into one platform.

The system is designed around **three user roles**: Jobseeker, Employer, and Administrator. Jobseekers can explore opportunities and monitor their applications; employers can publish openings and review applicants; administrators can review verification submissions, moderate platform activity, and manage records.

### Project objectives

- Make job opportunities easier for graduates and jobseekers to discover.
- Provide an organized application and recruitment process.
- Give employers a dedicated space to manage openings and candidates.
- Introduce verification and administrative review processes.
- Provide role-specific dashboards, notifications, and records.

> **Project scope:** This README documents the system's designed and implemented modules discussed during development. Some functions may require third-party credentials or environment-specific configuration. Availability in a particular deployment should be checked directly in the running application.

## Table of contents

- [Overview](#overview)
- [User roles](#user-roles)
- [Key features](#key-features)
- [Typical workflows](#typical-workflows)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Security and access control](#security-and-access-control)
- [Testing and troubleshooting](#testing-and-troubleshooting)
- [Deployment notes](#deployment-notes)
- [Screenshots](#screenshots)
- [Development and contribution](#development-and-contribution)
- [Author](#author)
- [License](#license)

## User roles

| Role | Primary responsibilities |
| --- | --- |
| **Jobseeker** | Discover jobs, view company information, save opportunities, manage profile information, submit applications, and track progress. |
| **Employer** | Maintain company information, create and manage job postings, review applicants, and manage recruitment outcomes. |
| **Administrator** | Review employers and jobseekers, supervise job content and requests, manage users and records, and monitor system activity. |

## Key features

### For jobseekers

- **Job search and details:** Explore available job openings and review responsibilities and requirements.
- **Application management:** Submit job applications and track them from a dedicated My Applications view.
- **Bookmarks:** Save interesting job listings for later review.
- **Company discovery:** Browse companies and see company details, listings, and reviews.
- **Profile and resume:** Maintain jobseeker information and review resume-related content.
- **Dashboard:** View relevant job and application information in one place.
- **Messages and notifications:** Access recruitment-related communications and updates.
- **Job matching:** Application summaries and matching-related information are part of the system's recruitment workflow; accuracy depends on the configured matching logic.

### For employers

- **Company profile:** Manage business details presented to applicants.
- **Job posting management:** Create, edit, publish, archive, and review job postings, including drafts.
- **Applicant review:** Review applicants and manage stages such as interview, hired, and declined.
- **Job edit requests:** Support administrative review where changes require approval.
- **Recruitment dashboard:** See job and applicant summaries.
- **Messages, notifications, and settings:** Manage relevant employer communication and account preferences.
- **Company reviews:** View feedback associated with the company.

### For administrators

- **Admin dashboard:** Oversee key platform data and activities.
- **User management:** Review and manage accounts and account records.
- **Employer and jobseeker verification:** Review supporting documents and verification decisions.
- **Job oversight:** Review postings, edit requests, posting history, offers, and related records.
- **Applications and applicants:** Monitor applications and recruitment information across the platform.
- **Records and exports:** Filter available administrative records and use supported PDF/Excel export options.
- **System logs:** Review recorded activities for accountability and auditing.
- **Notifications, profiles, and archives:** Work with corresponding administrative modules.

## Typical workflows

### Job application

1. A jobseeker creates or accesses an account and completes their profile.
2. The jobseeker searches for an opening and reads the job details.
3. The jobseeker applies to the selected position.
4. The employer reviews the applicant and updates the recruitment stage.
5. The jobseeker monitors application updates through the application area and notifications.

### Employer recruitment

1. An employer completes company information and any required verification steps.
2. The employer creates a job listing or draft.
3. The listing enters the appropriate publishing or review workflow.
4. Applicants submit their information for the published position.
5. The employer evaluates candidates and manages their application status.

### Administrative review

1. An administrator opens the appropriate verification, job, or account record.
2. The administrator inspects the information and supporting documents.
3. The administrator approves, declines, or places a request on hold as appropriate.
4. The resulting status is reflected in the relevant system workflow; system logging and notifications may record the activity.

## Technology stack

| Layer | Technologies / tools | Purpose |
| --- | --- | --- |
| **Frontend** | React.js, JavaScript, Tailwind CSS | Interactive, responsive user interface |
| **Backend** | Node.js, Express.js | Server logic and APIs |
| **Database** | MongoDB, Mongoose | Data persistence and modeling |
| **Security** | bcrypt, role-based authorization, input validation, Helmet | Protect account information and application requests |
| **Bot protection** | Cloudflare Turnstile | CAPTCHA verification for configured flows |
| **Development** | Git, GitHub, VS Code, MongoDB Compass | Version control and developer tools |

> Additional packages, integrations, and versions should be verified against `frontend/package.json` and `backend/package.json` in the repository.

## Project structure

The following **top-level folders are verified** in the repository:

```text
phinmaau-job-portal-atlas/
├── frontend/        # React web application
├── backend/         # Node.js / Express API and server code
├── .gitignore
└── README.md        # Project documentation (this file)
```

The application also uses frontend layouts and pages for Jobseeker, Employer, and Admin roles, along with backend controllers and models for jobs, applications, users, messages, notifications, and logs. **Internal file paths are intentionally not enumerated here** because they should be checked against the current commit before documenting them as definitive.

## Getting started

### Prerequisites

Install or prepare:

- Node.js and npm (use the version supported by the project's package files)
- Git
- A MongoDB instance or MongoDB Atlas cluster
- A code editor such as Visual Studio Code
- Required environment credentials for the services you intend to use

### 1. Clone the repository

```bash
git clone https://github.com/Eylizer0101/phinmaau-job-portal-atlas.git
cd phinmaau-job-portal-atlas
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

Create or configure the backend `.env` file using the **exact environment variable names referenced by the backend source code**. See [Environment configuration](#environment-configuration).

Review the actual startup scripts:

```bash
npm run
```

Start the backend using the script available in `backend/package.json` (commonly `npm run dev` or `npm start`, depending on the project).

### 3. Install frontend dependencies

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run
```

Configure the frontend environment variables or API base URL as required by the current source. Start the frontend with the command listed in `frontend/package.json` (for example, `npm start` or `npm run dev`, **only if that script exists**).

### 4. Open the application

After both processes start successfully, open the local URL shown in the frontend terminal. Make sure the frontend's API configuration points to the running backend.

> **Why scripts are not hard-coded:** The public repository listing confirmed the `frontend/` and `backend/` directories, but the exact scripts and runtime ports were not verified. This avoids misleading setup instructions.

## Environment configuration

Most full-stack applications require local environment settings. The following table is a **configuration checklist, not a claim about exact variable names in this repository**.

| Configuration | What to provide |
| --- | --- |
| Database connection | MongoDB local connection string or MongoDB Atlas URI |
| Server port | Port on which the backend should listen |
| Authentication secret | A strong, private signing or session secret if used by the app |
| Frontend origin | Approved browser origin for API/CORS configuration |
| API base URL | Address the frontend uses to reach the backend |
| CAPTCHA | Cloudflare Turnstile keys where the feature is enabled |
| Email service | Provider configuration if account verification or notifications use email |
| File storage | Upload settings if profile documents, company documents, or resumes are stored externally |

To find the exact key names, inspect the source for `process.env` in the backend and `process.env` / `import.meta.env` in the frontend. Also look for any `.env.example` files.

**Never publish secrets.** Keep `.env` files, connection credentials, API tokens, passwords, and private verification documents out of Git history. If credentials have already been committed, rotate or revoke them and remove them from the repository history where appropriate.

## Security and access control

The project's security-related design and implementation includes:

- **Role-based access control** for Jobseeker, Employer, and Admin operations.
- **Password hashing** using bcrypt rather than storing plaintext passwords.
- **Validation and sanitization** to reduce invalid requests and common input-related threats.
- **Protected authentication/session flows** with appropriate authorization checks on the server.
- **Cloudflare Turnstile** for bot protection in configured authentication flows.
- **Security headers** using Helmet.
- **System activity logs** for traceability.
- **Verification document review** to support employer and user trust workflows.

Security should be validated through configuration review, dependency updates, access-control tests, and a deployment security assessment. A feature being listed here does **not** constitute an independent security audit.

## Testing and troubleshooting

Before showcasing or deploying AGAPAY, check these core scenarios:

- Each role can sign in and access only its permitted pages and API functions.
- Registration and authentication failures show useful errors.
- Employers can create and manage jobs according to verification and approval rules.
- Jobseekers can search, save, and apply to available jobs.
- Application status changes are reflected consistently for employers and jobseekers.
- Uploads, verification documents, and email/CAPTCHA integrations work with valid configuration.
- Admin actions, filtering, and supported exports behave correctly.
- The interface is usable on desktop, tablet, and mobile screen sizes.

| Problem | Suggested checks |
| --- | --- |
| Frontend cannot reach API | Confirm backend is running; check API base URL, host, port, and CORS. |
| Database connection fails | Verify MongoDB URI, user permissions, Atlas network access, and server logs. |
| Login fails | Check credentials, auth secret/session settings, cookies, and backend error output. |
| Upload fails | Review file size/type restrictions, storage settings, backend limits, and server logs. |
| CAPTCHA fails | Check Turnstile site key, secret key, domain configuration, and verification endpoint. |
| Email is not delivered | Check email-provider credentials, sender verification, logs, and rate limits. |

## Deployment notes

AGAPAY can be deployed with separate frontend and backend services and a managed MongoDB database, provided the project build scripts and hosting configuration support that setup.

Before releasing a deployment:

1. Configure environment variables within the hosting provider rather than committing `.env` files.
2. Set the correct API URL and permitted origins.
3. Configure the database's network and access rules.
4. Confirm HTTPS, secure session/cookie settings, and uploaded-file handling.
5. Test all three roles and verify email/CAPTCHA integrations against the deployment domain.
6. Set up backups and review logs for unexpected failures.

**Live demo:** No public AGAPAY deployment URL is included here because one has not been independently verified for this repository.

## Screenshots

Screenshots are useful for showcasing the system to employers or reviewers. Suggested images:

| Screen | Suggested content |
| --- | --- |
| Landing page | Platform introduction and navigation |
| Jobseeker dashboard | Applications, recommended jobs, or overview |
| Job search | Listings and filtering interface |
| Employer dashboard | Job and applicant overview |
| Manage jobs | Posting and editing workflow |
| Admin dashboard | Platform management and statistics |
| Verification | Administrative review workflow |

To add screenshots later, store suitable images under a repository folder such as `docs/screenshots/`, then embed them with Markdown: `![Jobseeker dashboard](docs/screenshots/jobseeker-dashboard.png)`. Avoid screenshots containing real personal data or private documents.

## Development and contribution

This repository documents an academic capstone application. Before making changes:

1. Create a separate branch for a feature or fix.
2. Keep UI changes consistent with the existing design and role permissions.
3. Do not commit environment secrets, production data, or private verification files.
4. Test affected workflows and include clear commit messages.
5. Open a pull request when collaboration is appropriate.

## Author

**Eylizer De Afria**  
Bachelor of Science in Information Technology, major in System Development  
PHINMA Araullo University  
**Project role:** Full-Stack Development

- **Portfolio:** [eylizer-portfolio.onrender.com](https://eylizer-portfolio.onrender.com)
- **GitHub:** [@Eylizer0101](https://github.com/Eylizer0101)
- **LinkedIn:** [Eylizer De Afria](https://www.linkedin.com/in/eylizer-de-afria-040724430)

## License

© 2026 Eylizer De Afria. All Rights Reserved.

This project is provided publicly for educational, portfolio, viewing, and evaluation purposes only. **No permission is granted to copy, modify, redistribute, sublicense, or use the project commercially** without prior written permission from the relevant copyright holder(s).

Public availability on GitHub does not make the project open source. Any license field in a `package.json` file should not be interpreted as a repository-wide permission grant. Third-party libraries, assets, and contributions remain subject to their own licenses and ownership rights.

For permission inquiries, contact the repository owner through GitHub.

---

<div align="center">

**AGAPAY — Connecting people with career opportunities.**

*Academic capstone project · PHINMA Araullo University*

</div>
