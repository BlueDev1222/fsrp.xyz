# PROJECT: Complete ER:LC Florida Roleplay Community Platform

Build a complete, production-ready management platform for a Roblox Emergency Response: Liberty County (ER:LC) roleplay community.

The community is a serious Florida-themed roleplay server inspired by large ER:LC communities such as Florida State Roleplay.

IMPORTANT:
- Do NOT simply clone another community's website, branding, copyrighted graphics, proprietary code, or private systems.
- Build an original platform with similar categories of functionality.
- Use original UI/UX and branding.
- Everything should be configurable so the community can later change its name, departments, ranks, rules, links, colors, Discord IDs, Roblox group IDs, and other settings.
- Never hard-code API keys, Discord bot tokens, database credentials, webhook URLs, or other secrets into frontend/client code.
- Put secrets in environment variables.
- Create `.env.example`.
- Validate and sanitize all user input.
- Use proper authentication, authorization, rate limiting, audit logging, and secure API design.

## 1. PLATFORM PURPOSE

This should be an all-in-one management platform for an ER:LC roleplay community.

It should combine:

- Main community website
- Member dashboard
- Staff dashboard
- Roblox account linking
- Discord account linking
- Applications
- Staff applications
- Department applications
- Application review system
- Moderation system
- Infractions
- Ban management
- Ban appeals
- Staff activity
- Session management
- Department management
- CAD/MDT
- Priority system
- Roleplay session information
- Economy
- Shop
- Memberships
- Restricted vehicle/weapon information
- Rules/handbooks
- Staff logs
- Audit logs
- API/webhook integrations
- Administration dashboard

The website should feel like a professional community-management product rather than a simple static website.

---

# 2. TECHNOLOGY

Choose a modern production-ready stack.

Preferred:

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:
- Next.js server/API routes or a separate Node.js backend
- TypeScript

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- Discord OAuth2
- Roblox account verification/linking

Other:
- Redis when appropriate for caching/rate limits
- Discord bot using discord.js
- Docker support
- `.env` configuration
- Database migrations
- Seed script
- Development and production configurations

Create a clean monorepo/project structure.

---

# 3. MAIN WEBSITE

Create a polished landing page for the RP community.

Navigation:

Home
About
Departments
Sessions
Rules
Applications
Staff
Shop
Appeals
CAD/MDT
Dashboard
Discord

The homepage should display:

- Community/server name
- Florida-themed branding
- ER:LC roleplay description
- Join Server button
- Join Discord button
- Roblox Group button
- Current session status
- Current player/session information when available
- Priority status
- Peacetime status
- Featured departments
- Recent announcements
- Applications currently open
- Server statistics

Statistics could include:

Members
Staff Members
Departments
Sessions Hosted
Applications Submitted
Moderations
Active Staff

Create responsive desktop/mobile layouts.

Use smooth but subtle animations.

---

# 4. ACCOUNT SYSTEM

Users should be able to sign in using Discord.

After signing in, users should have a profile containing:

Discord ID
Discord username
Discord avatar
Roblox username
Roblox user ID
Roblox avatar/headshot
Community roles
Departments
Department ranks
Staff rank
Join date
Account creation date
Moderation history visibility permissions
Application history
Session attendance
Activity information
Economy balance
Membership tier

Allow users to link their Roblox account.

Create a secure Roblox verification workflow.

Do not trust usernames alone.

---

# 5. MEMBER DASHBOARD

After logging in, normal community members receive a dashboard.

Dashboard sections:

Overview
My Profile
My Applications
My Departments
My Moderations
My Appeals
Sessions
Economy
Membership
Settings

Overview should show useful cards:

Current Session
Priority Status
Peacetime Status
My Department
My Staff Rank
Economy Balance
Membership
Recent Moderations
Pending Applications

---

# 6. DEPARTMENTS

Create a complete department system.

Default example departments:

Florida Highway Patrol

Purpose:
State/highway law enforcement and realistic highway patrol roleplay.

Hillsborough County Sheriff's Office

Purpose:
County law enforcement and sheriff/deputy roleplay.

Tampa Police Department

Purpose:
Municipal policing and public-safety roleplay.

Tampa Fire Department

Purpose:
Fire, rescue, and EMS roleplay.

Florida Department of Transportation

Purpose:
Roadway incidents, traffic control, transportation services, and highway assistance.

Florida Government

Allow multiple government levels:

State
County
Municipal

Special Response Team

This should be a restricted/tryout-based tactical department.

Also create a Department Hub/oversight system.

Each department should have:

Name
Abbreviation
Logo
Description
Discord invite
Leadership
Members
Ranks
Divisions
Applications
Activity requirements
Department handbook
Department announcements
Department strikes
Department suspensions
Department logs

Admins must be able to create additional departments without modifying code.

---

# 7. DEPARTMENT RANKS

Every department needs customizable ranks.

Example structure:

Commissioner
Chief
Assistant Chief
Commander
Captain
Lieutenant
Sergeant
Corporal
Senior Officer
Officer
Probationary Officer

Do NOT force those exact ranks on every department.

Department administrators should be able to create, delete, rename and reorder ranks.

Each rank can have permissions.

Examples:

manageMembers
promoteMembers
demoteMembers
removeMembers
manageApplications
manageDepartmentLogs
manageDivisions
manageTrainings

---

# 8. CALLSIGN SYSTEM

Create configurable callsigns.

For example, unwhitelisted Tampa Police members may use:

1A-###

where ### can range from 100–999.

Allow administrators to configure callsign formats per department.

Prevent duplicate active callsigns where required.

The system should support:

Unit identifier
Department
Member
Rank
Status
Assigned callsign

---

# 9. APPLICATION SYSTEM

Build a full application builder similar in concept to modern RP community application systems.

Administrators can create applications using a visual form builder.

Question types:

Short Answer
Long Answer
Multiple Choice
Checkbox
Dropdown
Yes/No
Number
Date
Roblox Username
Discord Username

Applications can have:

Title
Description
Opening date
Closing date
Required roles
Minimum account age
Cooldown
Maximum submissions
Passing requirements

Application examples:

Staff Application
FHP Application
Sheriff Application
TPD Application
Fire/EMS Application
FDOT Application
Government Application
SRT Application
Department Leadership Application

Application statuses:

Draft
Open
Closed
Pending
Under Review
Interview
Accepted
Denied
Withdrawn

Staff reviewers can:

Accept
Deny
Request Interview
Leave internal notes
Assign reviewer
Score answers
Add comments

Every action should create an audit log.

---

# 10. STAFF APPLICATION

Create a dedicated staff application.

Administrators can edit all questions.

Include optional requirements such as:

Discord account age
Roblox account age
Community membership duration
Minimum activity
No recent moderation

When accepted:

Optionally assign a Discord role automatically.

Create a staff profile.

Log who accepted the applicant.

---

# 11. BAN APPEALS

Build a dedicated ban appeal system.

Public route:

/appeal

Users sign in and see eligible punishments.

Appeal fields:

Roblox username
Discord account
Punishment ID
Reason for punishment
Why should the punishment be removed?
What will you do differently?
Additional information

Status:

Pending
Under Review
Accepted
Denied
Expired

Staff should be able to:

Claim appeal
Leave internal notes
Accept
Deny
Modify punishment
Unban when appropriate

The user should be able to see the final decision.

Keep an immutable history of appeal actions.

---

# 12. MODERATION SYSTEM

Create a full moderation panel.

Punishment types:

Note
Warning
Kick
Temporary Ban
Permanent Ban
Blacklist

Moderation record:

Case ID
User
Moderator
Reason
Evidence
Date
Expiration
Status
Related session
Internal notes

Generate readable case IDs such as:

FSRP-000001

or use the configured community abbreviation.

Allow evidence attachments/URLs where appropriate.

Create advanced searching/filtering.

Search by:

Roblox username
Discord username
Discord ID
Roblox ID
Case ID
Moderator
Punishment type

---

# 13. STAFF PANEL

Create a dedicated staff dashboard.

Sections:

Dashboard
Moderations
Players
Applications
Appeals
Sessions
Reports
Departments
Activity
Staff
Logs

Dashboard cards:

Active Staff
Current Session
Pending Reports
Pending Appeals
Pending Applications
Moderations Today
Players Online

Permission-check EVERY action server-side.

Never rely on hiding frontend buttons for security.

---

# 14. STAFF RANKS

Create customizable staff ranks.

Example hierarchy:

Trial Moderator
Moderator
Senior Moderator
Administrator
Senior Administrator
Management
Directive
Ownership

Every rank should have configurable permissions.

Example permissions:

viewModerations
createModeration
editModeration
deleteModeration
banUsers
permanentBan
viewAppeals
manageAppeals
manageApplications
manageSessions
manageDepartments
manageStaff
viewAuditLogs
manageCommunitySettings

Use role-based access control (RBAC).

---

# 15. STAFF ACTIVITY

Track legitimate platform/community activity.

Show:

Sessions attended
Sessions hosted
Applications reviewed
Appeals reviewed
Moderations issued
Reports handled
Department actions
Last active time

Create activity leaderboards where administrators enable them.

Do not create invasive monitoring of unrelated user activity.

---

# 16. SESSION SYSTEM

Sessions are a major feature.

Create statuses:

Scheduled
Starting Soon
Active
Full
Ended
Cancelled

Session information:

Host
Co-hosts
Start time
End time
Server code/link
Player count
Maximum players
Priority status
Peacetime status
Notes

Reference schedule:

Sessions are generally hosted daily around 11:30 AM, but the schedule must be configurable.

Allow scheduled sessions and manually created sessions.

Create Discord announcements when sessions:

Are scheduled
Start
Become full
End
Are cancelled

---

# 17. SESSION ATTENDANCE

Track members attending sessions.

Record:

User
Join time
Leave time
Total session duration
Department
Role

Staff can see attendance history.

Members can see their own attendance.

---

# 18. PRIORITY SYSTEM

Create an RP priority system.

Statuses:

Available
Requested
Claimed
Active
Cooldown
Peacetime

Members can request priority.

Request fields:

Roleplay type
Participants
Description
Requested duration

Examples of scenes requiring priority may include:

Bank robbery
Jewelry robbery
Hostage scene
Kidnapping scene

Staff can approve or deny priority.

Display the current priority prominently.

---

# 19. CAD / MDT

Create an integrated roleplay CAD/MDT.

This is fictional roleplay information only.

Roles:

Civilian
Law Enforcement
Fire/EMS
Dispatch

## CIVILIAN

Users can create roleplay characters.

Character fields:

First name
Last name
Date of birth
Gender
Address
Phone
Occupation
Notes

Allow:

Vehicle registration
License information
Character history

## LAW ENFORCEMENT MDT

Allow officers to:

Search characters
Search license plates
Search vehicles
Create citations
Create warnings
Create arrests
Create warrants
Create BOLOs
Create incident reports
View active calls

## DISPATCH

Dispatch interface should show:

Active units
Unit callsigns
Unit status
Active calls
Assigned units
Priority calls

Unit statuses:

10-8 / Available
10-6 / Busy
10-7 / Out of Service
Traffic Stop
On Scene
En Route

Make codes configurable.

## FIRE/EMS

Allow:

Medical calls
Fire calls
Unit assignment
Patient reports
Incident reports
Transport status

---

# 20. RULES SYSTEM

Create a rules page managed through the admin dashboard.

Seed it with categories based on this community style:

Random Deathmatch (RDM)
Vehicle Deathmatch (VDM)
Fail Roleplay (FRP)
New Life Rule (NLR)
Fear Roleplay
Staff directions during moderation scenes
Safezones
Banned roleplays
Priority/peacetime rules
Metagaming
Powergaming
Stolen radio/scanner restrictions
Unauthorized agencies
Scene interference
Pointless pursuits
Water evasion
Priority requests
Realistic driving
Bunny hopping
Gang roleplay

Admins must be able to edit these without modifying source code.

Rules should support:

Title
Description
Examples
Punishment guidance
Category
Display order

---

# 21. SAFEZONES

Create configurable safezone documentation.

Default examples:

Civilian Spawn
Sheriff's Office
Police Station
Fire Departments
DOT Station

These should be database-configurable.

---

# 22. RESTRICTED ITEMS

Create a Restricted Items page.

Categories:

Vehicles
Weapons
Other

Each restriction should contain:

Item
Restriction level
Who may use it
Required membership/role
Notes

Example restricted vehicle data:

Navara Horizon / GTR
Truckatron / Cybertruck
Bullhorn Determinator SFP Fury
Chevlon Corbeta
Takeo Experience
Leland LTS5 V Blackwing
Averon Anodic
Pea Car
Heavy Wreckers

Support restrictions such as:

Server Booster
Active Roleplayer
Directive
VIP
Ownership Approval
Completely Restricted

Restricted weapons may include:

Remington MSR
Remington 700
Orsis T-5000
M249
PPSH-41
M14
TEC-9

Administrators must be able to change all restrictions.

---

# 23. ECONOMY

Create a community economy.

Users have:

Balance
Transaction history
Purchases
Rewards

Transactions contain:

ID
User
Amount
Type
Reason
Created by
Timestamp

Types:

Session Reward
Staff Reward
Purchase
Admin Adjustment
Membership Reward
Event Reward

Protect against duplicate transactions.

Use database transactions for balance updates.

---

# 24. MEMBERSHIPS

Create configurable supporter memberships.

Seed example tiers:

Bronze
Silver
Gold
Platinum
Platinum+

DO NOT hard-code benefits.

Create a membership editor.

Possible benefits include:

Special Discord role
Exclusive chats
VIP lounge
Media permissions
Economy rewards
Priority benefits
Temporary voice channels
Custom roles
Staff interview request
Ownership chat
Early access
Event requests

Display clearly that purchases and benefits are determined by the community configuration.

---

# 25. SHOP

Create a shop page with categories:

Memberships
Advertisements
Economy
Apparel
Utility Items
Donations

Example advertisement products:

Here Ping
Everyone Ping
Sponsored Giveaway
Queue Bypass

Example economy packages:

1,000,000
5,000,000
10,000,000

Example community merchandise:

Hoodie
Polo
Suit
Detective Suit

Allow external Roblox purchase URLs.

Admins should manage:

Product name
Description
Image
Price
Category
Purchase URL
Availability
Display order

Do NOT process Roblox payments directly unless supported through an official integration.

---

# 26. DISCORD INTEGRATION

Create a Discord bot.

Use Discord.js.

Features:

Account verification
Role synchronization
Application notifications
Moderation notifications
Session announcements
Appeal notifications
Department notifications
Staff activity
Economy commands
Priority commands

Suggested slash commands:

/profile
/balance
/session
/session start
/session end
/session status
/priority request
/priority status
/moderate
/case
/appeal
/applications
/activity

Restrict staff commands using permissions.

---

# 27. DISCORD ROLE SYNC

Allow administrators to map website roles to Discord roles.

Example:

Website Staff Rank → Discord Staff Role

Department → Discord Department Role

Department Rank → Discord Rank Role

Membership → Discord Membership Role

Synchronization should be logged.

Never remove unrelated Discord roles.

---

# 28. ROBLOX GROUP INTEGRATION

Add configuration for the community's Roblox group.

Display:

Roblox username
Avatar
Group membership
Group rank where available through supported APIs/integrations

Create a Roblox group button on the website.

Do not scrape authenticated/private Roblox endpoints.

Use supported APIs.

---

# 29. COMMUNITY LINKS

Create centralized configurable links.

Examples:

Discord:
discord.gg/fsrp

Roblox Group:
https://www.roblox.com/communities/1082694446/Florida-State-Roleplay-Main-Roblox-Group#!/about

Staff Application:
https://melonly.xyz/w/7339778090454749184/Florida-Workspace/floridasn-staffapp

Ban Appeals:
https://banappeal.gg/fsrpf

These should initially be references/configuration examples and should be replaceable from the admin panel.

---

# 30. REPORT SYSTEM

Members can report:

Players
Staff
Rule violations
Bugs

Report fields:

Reporter
Reported user
Category
Description
Evidence
Session
Timestamp

Status:

Open
Claimed
Investigating
Resolved
Dismissed

Allow staff to claim reports.

Prevent two staff members from accidentally claiming the same report simultaneously.

---

# 31. STAFF LOGS

Create logs for important staff actions.

Examples:

Moderation Created
Moderation Edited
Moderation Removed
Appeal Accepted
Appeal Denied
Application Accepted
Application Denied
Member Promoted
Member Demoted
Member Removed
Session Started
Session Ended
Priority Changed
Role Changed
Settings Changed

Each log:

ID
Actor
Action
Target
Before state
After state
Timestamp
IP/security metadata when legitimately required for platform security

Never publicly expose sensitive security information.

---

# 32. AUDIT LOG

Create an immutable administrative audit log.

Admins can filter by:

Actor
Action
Target
Date
Department
Category

Normal staff should not be able to erase audit history.

---

# 33. ADMIN DASHBOARD

Create an advanced administration panel.

Sections:

General
Branding
Users
Staff
Permissions
Departments
Applications
Sessions
Moderations
Appeals
Rules
Restricted Items
Economy
Shop
Memberships
Discord
Roblox
Integrations
Security
Audit Logs

Administrators should be able to configure nearly everything without editing source files.

---

# 34. BRANDING SYSTEM

Settings:

Community Name
Short Name
Logo
Banner
Primary Accent
Secondary Accent
Discord Invite
Roblox Group
ER:LC Server Information

Support dark mode.

Make the design professional and modern.

Do not copy Melonly's interface.

Create an original visual identity.

---

# 35. ANNOUNCEMENTS

Create announcements.

Fields:

Title
Body
Author
Timestamp
Category
Pinned
Expiration

Categories:

Community
Session
Department
Update
Maintenance

Optionally send announcements to configured Discord channels.

---

# 36. NOTIFICATIONS

Users receive notifications for:

Application updates
Appeal updates
Moderation updates
Department changes
Session starting
Priority changes
Staff messages

Support:

Read/unread
Notification preferences

---

# 37. SEARCH

Create global staff search.

Search:

Users
Roblox usernames
Discord users
Moderation cases
Applications
Appeals
Departments
Reports

Implement pagination.

---

# 38. DATABASE

Create proper normalized Prisma models.

At minimum consider models for:

User
LinkedAccount
StaffProfile
StaffRank
Permission
Role
Department
DepartmentRank
DepartmentMember
Division
Application
ApplicationQuestion
ApplicationSubmission
ApplicationAnswer
ApplicationReview
Moderation
Appeal
Report
Session
SessionAttendance
PriorityRequest
EconomyAccount
EconomyTransaction
Membership
UserMembership
ShopProduct
Rule
RestrictedItem
Announcement
Notification
AuditLog
CADCharacter
CADVehicle
CADLicense
CADCitation
CADArrest
CADWarrant
CADBolo
CADCall
CADUnit
CADIncident

Add indexes where necessary.

Use proper foreign keys.

---

# 39. SECURITY

Security is extremely important.

Implement:

Server-side authorization
RBAC
CSRF protection where applicable
Secure cookies
Input validation
SQL injection protection
XSS prevention
Rate limiting
OAuth state validation
Secure secret management
Webhook verification where supported
Audit logging
Brute-force protections
Session expiration

Never expose:

Discord bot token
OAuth secret
Database password
API keys
Webhooks
Internal administrative secrets

Frontend code must NEVER contain secrets.

---

# 40. ERROR HANDLING

Create:

Custom 404 page
Custom 403 page
Custom 500 page

API responses should use standardized errors.

Example:

{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "You do not have permission to perform this action."
  }
}

Log server errors without exposing sensitive stack traces to users.

---

# 41. UI

Use a clean professional dashboard.

Sidebar:

Overview
Sessions
Departments
Applications
Moderation
Appeals
CAD
Economy
Reports
Staff
Logs
Settings

Use:

Cards
Tables
Search bars
Filters
Modal confirmations
Pagination
Status badges
Toast notifications
Loading skeletons
Empty states

The UI must work on:

Desktop
Tablet
Mobile

---

# 42. SEED DATA

Create development seed data.

Include fake:

Members
Staff
Departments
Applications
Moderations
Sessions
Economy transactions
Reports

Clearly mark development accounts.

Never ship development admin credentials into production.

---

# 43. DOCUMENTATION

Create a detailed README.

Explain:

Installation
Dependencies
Database setup
Discord application setup
Discord bot setup
OAuth setup
Roblox integration
Environment variables
Database migrations
Development server
Production build
Docker deployment
Backups
Security considerations

Create:

.env.example

Example:

DATABASE_URL=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ROBLOX_GROUP_ID=

Never populate these with real credentials.

---

# 44. INITIAL SETUP WIZARD

On first launch, if no community configuration exists, open:

/setup

Steps:

1. Community Information
2. Branding
3. Discord
4. Roblox Group
5. Departments
6. Staff Ranks
7. Permissions
8. Session Settings
9. Finish

After setup, disable public access to the setup wizard.

---

# 45. DEVELOPMENT QUALITY

Do not make this a mockup.

I want functional backend logic.

Do not fill important pages with:

"Coming Soon"

Do not create fake buttons.

Buttons should work.

Forms should save.

Tables should load from the database.

Permissions should actually be checked.

OAuth should actually work once credentials are provided.

The Discord bot should actually run once configured.

Database migrations should work.

The project should compile without TypeScript errors.

Run:

lint
typecheck
tests
production build

Fix errors before considering the project complete.

---

# 46. TESTING

Create automated tests for critical functionality.

Test:

Authentication
Permissions
Applications
Moderations
Appeals
Economy transactions
Session management
Priority requests
Department permissions

Especially test that ordinary users cannot call staff/admin API endpoints manually.

---

# 47. PROJECT DELIVERY

Build this incrementally.

PHASE 1:
Project architecture, authentication, database and permissions.

PHASE 2:
Main website and member dashboard.

PHASE 3:
Departments and applications.

PHASE 4:
Staff dashboard, moderation and appeals.

PHASE 5:
Sessions, priority and reports.

PHASE 6:
CAD/MDT.

PHASE 7:
Economy, memberships and shop.

PHASE 8:
Discord and Roblox integrations.

PHASE 9:
Administration panel.

PHASE 10:
Security review, testing, documentation and production build.

Do not stop after creating the directory structure.

Continue implementing each phase.

When an external service requires credentials I have not provided, implement the integration and environment-variable configuration, document exactly what credential is required, and allow the rest of the application to run without it.

At the end provide:

1. Complete project structure
2. Database schema
3. Setup instructions
4. Required environment variables
5. Discord setup instructions
6. Roblox setup instructions
7. Development commands
8. Production deployment instructions
9. Default admin/bootstrap procedure
10. Security checklist