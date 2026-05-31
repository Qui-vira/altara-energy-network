# Altara Energy Network

A private solar audit, equipment recommendation, quote, and pro-forma invoice system for Altara Energy Network, a Nigerian solar sales and outsourcing business.

The product is designed around Altara's operating model:

- Customers submit solar readiness and site information.
- Altara owns the calculator, customer relationship, customer data, vendor data, pricing logic, quotes, and invoices.
- Installers verify site/load details, flag technical risks, and install only.
- Vendors supply equipment after client payment.
- Clients pay Altara.
- Safety-critical recommendations are marked for installer verification before final approval.

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS with shadcn/ui-style reusable components
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth credentials auth
- **Forms:** React Hook Form + Zod
- **PDF generation:** PDFKit
- **Uploads:** Image upload support for roof, wiring, and inverter/battery location photos

## Setup

```bash
npm install
cp .env.example .env
# update DATABASE_URL and NEXTAUTH_SECRET
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

Seed credentials for local setup:

- Admin: `admin@altara.energy` / `AltaraAdmin2026!`
- Installer: `installer@altara.energy` / `AltaraInstaller2026!`

Change these credentials immediately outside local development.

## App Architecture

### Product Boundaries

Altara owns:

- customer relationship
- calculator
- customer data
- vendor database
- pricing logic
- quote workflow
- invoice workflow

Installer owns only:

- site/load verification
- technical risk checks
- installation notes
- work order execution

Installer must not see:

- cost price
- profit margin
- vendor margin
- full customer financial data
- full Altara pricing logic

### Customer Side

- Landing page
- Free Solar Readiness Check form
- Appliance/load input
- Photo uploads
- Submission confirmation:
  - "Your request has been received. Altara will review and send your recommendation."

### Admin Side

- Secure login
- Dashboard
- Lead pipeline
- Lead detail page
- Appliance load calculator
- Site inspection form
- Installer verification form
- Photo review module
- Equipment database
- Vendor database
- Research database
- Quote builder
- Pro-forma invoice generator
- Installer work order generator
- Maintenance tracking
- Notes and activity log

### Installer Side

- Restricted work order list
- Restricted work order detail
- Site photos
- Appliance/load summary
- Verification checklist
- Installation notes
- Assigned timeline

## Database Schema

The database is organized around the full Altara workflow rather than a generic CRM.

### Auth and Users

#### `User`

Stores private users.

- `id`
- `name`
- `email`
- `passwordHash`
- `role`: `ADMIN | INSTALLER`
- `active`
- `createdAt`
- `updatedAt`

### Customer and Lead Workflow

#### `Lead`

Stores Solar Readiness Check submissions and pipeline state.

- `id`
- `name`
- `phone`
- `email`
- `location`
- `propertyType`
- `nepaAvailabilityPerDay`
- `monthlyFuelSpend`
- `generatorUse`
- `backupHoursNeeded`
- `budgetRange`
- `urgency`
- `extraNotes`
- `photoUrls`
- `status`
- `quoteVerificationRequired`
- `createdAt`
- `updatedAt`

#### Lead Status Pipeline

- `NEW_LEAD` - New Lead
- `CONTACTED` - Contacted
- `AUDIT_IN_PROGRESS` - Audit In Progress
- `INSTALLER_VERIFICATION_NEEDED` - Installer Verification Needed
- `QUOTE_READY` - Quote Ready
- `INVOICE_SENT` - Invoice Sent
- `PAID` - Paid
- `MATERIALS_ORDERED` - Materials Ordered
- `INSTALLATION_SCHEDULED` - Installation Scheduled
- `INSTALLED` - Installed
- `MAINTENANCE_FOLLOW_UP` - Maintenance Follow-up

### Appliance Load Audit

#### `ApplianceLoad`

Stores each appliance/load row.

- `id`
- `leadId`
- `name`
- `quantity`
- `wattage`
- `hoursPerDay`
- `category`
- `notes`

#### `LoadAudit`

Stores calculated or manually overridden audit output.

- `id`
- `leadId`
- `totalRunningWatts`
- `dailyEnergyWh`
- `dailyEnergyKwh`
- `backupEnergyWh`
- `suggestedInverterWatts`
- `suggestedBatteryWh`
- `suggestedSolarArrayWatts`
- `systemCategory`
- `warningFlags`
- `manualOverride`
- `overrideNotes`
- `calculationSnapshot`

Calculator formula:

```text
Quantity x Wattage x Hours Used Per Day = Daily Energy Use
```

System categories:

- `BASIC_BACKUP`
- `MEDIUM_HOME_BACKUP`
- `FULL_HOME_BACKUP`
- `SMALL_BUSINESS_BACKUP`
- `COMMERCIAL_AUDIT_REQUIRED`

Warning flags:

- budget too low
- load too high
- site photos missing
- roof risk
- shading risk
- wiring risk
- installer verification required

### Site Inspection and Installer Verification

#### `SiteInspection`

Stores admin/site inspection notes.

- `leadId`
- `roofCondition`
- `roofSpaceNotes`
- `wiringCondition`
- `shadingNotes`
- `inverterLocationNotes`
- `batteryLocationNotes`
- `earthingNotes`
- `safetyRisks`
- `installerRequired`

#### `InstallerVerification`

Stores installer technical verification.

- `leadId`
- `installerUserId`
- `actualLoadVerified`
- `wiringConditionChecked`
- `roofSpaceChecked`
- `shadingChecked`
- `inverterLocationChecked`
- `batteryLocationChecked`
- `earthingConditionChecked`
- `safetyRisksNoted`
- `installationDifficultyRated`
- `finalTechnicalComments`
- `completedAt`

### Photo Review and Future AI Placeholder

#### `PhotoReview`

Stores human photo review now and future vision-AI integration fields later.

- `leadId`
- `roofCondition`
- `shadingRisk`
- `wiringRisk`
- `batteryLocationRisk`
- `inverterVentilationRisk`
- `installationDifficulty`
- `additionalPhotoNotes`
- `aiAnalysisPlaceholder`
- `humanReviewRequired`

This module intentionally does not perform AI image analysis yet. It creates a clean integration point for a future vision model.

### Equipment Database

#### `EquipmentItem`

Editable equipment records.

- `brand`
- `model`
- `category`
- `capacity`
- `price`
- `vendor`
- `warranty`
- `stockStatus`
- `compatibilityNotes`
- `budgetLevel`
- `reliabilityScore`
- `localSupportScore`
- `installerFeedbackScore`
- `vendorTrustScore`
- `finalRecommendationScore`
- `adminScore`

Equipment categories:

- `INVERTER`
- `BATTERY`
- `SOLAR_PANEL`
- `CABLE`
- `BREAKER`
- `SURGE_PROTECTION`
- `MOUNTING_KIT`
- `EARTHING_MATERIAL`
- `COMBINER_BOX`
- `ACCESSORY`

Budget levels:

- `BUDGET`
- `VALUE`
- `PREMIUM`

Stock statuses:

- `IN_STOCK`
- `LOW_STOCK`
- `OUT_OF_STOCK`
- `PREORDER`
- `UNKNOWN`

### Vendor and Research Database

#### `Vendor`

Stores Altara-owned vendor records.

- `name`
- `contactName`
- `phone`
- `email`
- `location`
- `trustScore`
- `deliveryNotes`
- `paymentTerms`
- `active`

#### `SourceRegister`

Stores every research source.

- `sourceType`
- `sourceLink`
- `dateCollected`
- `expiryDate`
- `confidenceLevel`
- `reviewer`
- `notes`
- `proofUrl`

Source types:

- `VENDOR_QUOTE`
- `INSTALLER_FEEDBACK`
- `MARKET_RESEARCH`
- `COMPETITOR_PRICING`
- `WARRANTY_DOCUMENT`
- `FAILURE_REPORT`
- `COMPLIANCE_PROOF`
- `OTHER`

#### `VendorPrice`

Stores live vendor price desk entries.

- `vendorName`
- `equipmentType`
- `brand`
- `model`
- `capacity`
- `price`
- `stockStatus`
- `warranty`
- `deliveryTimeline`
- `proofUploadUrl`
- `validUntil`

#### `ResearchNote`

Stores editable research notes for:

- vendor price research
- installer labor cost research
- best inverter brands by budget
- best battery brands by budget
- best panel brands by budget
- warranty notes
- failure reports
- market notes
- competitor pricing
- Nigerian solar market insights

### Quotes and Invoices

#### `Quote`

Stores Altara-owned pricing and quote logic.

- `leadId`
- `quoteNumber`
- `status`
- `systemRecommendation`
- `equipmentCost`
- `installationLabor`
- `transport`
- `siteInspectionFee`
- `altaraManagementFee`
- `profitMargin`
- `optionalMaintenanceFee`
- `discount`
- `vatTax`
- `totalPrice`
- `paymentStructure`
- `depositAmount`
- `balanceAmount`
- `milestoneNotes`
- `adminApproved`
- `installerVerificationRequired`
- `approvalNotes`
- `expiresAt`

#### `QuoteLine`

Stores equipment, labor, and logistics lines.

- `quoteId`
- `equipmentItemId`
- `description`
- `quantity`
- `unitPrice`
- `lineTotal`
- `isLabor`

#### `Invoice`

Stores pro-forma invoices first.

- `leadId`
- `quoteId`
- `invoiceNumber`
- `status`
- `invoiceDate`
- `expiryDate`
- `totalAmount`
- `paymentTerms`
- `warrantyNotes`
- `disclaimer`

Invoice disclaimer:

> Final installation is subject to site verification, equipment availability, and technical approval.

### Work Orders, Maintenance, Notes, and Activity

#### `WorkOrder`

Installer-safe work order data.

- `leadId`
- `quoteId`
- `assignedInstallerId`
- `scope`
- `applianceLoadSummary`
- `installationNotes`
- `assignedTimeline`
- `status`

#### `MaintenanceRecord`

- `leadId`
- `scheduledFor`
- `type`
- `status`
- `notes`

#### `Note`

- `leadId`
- `author`
- `body`

#### `ActivityLog`

- `leadId`
- `actor`
- `action`
- `metadata`

## Route Structure

### Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and Solar Readiness Check form |
| `/api/leads` | Public lead submission and uploads |

### Auth Routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Secure login |
| `/api/auth/[...nextauth]` | NextAuth handler |

### Admin Routes

| Route | Purpose |
| --- | --- |
| `/admin` | Redirect to dashboard |
| `/admin/dashboard` | Pipeline counts, metrics, recent leads |
| `/admin/leads` | Lead list and status filtering |
| `/admin/leads/[id]` | Lead detail, load audit, photo review, site inspection, installer verification, quote, invoice, work order, maintenance, notes, activity |
| `/admin/equipment` | Editable equipment database and recommendation preview |
| `/admin/vendors` | Editable vendor database |
| `/admin/research` | Source register, vendor price desk, market research notes |
| `/admin/quotes` | Quote register |
| `/admin/invoices` | Pro-forma invoice register |
| `/admin/maintenance` | Maintenance tracking |

### Installer Routes

| Route | Purpose |
| --- | --- |
| `/installer/work-orders` | Installer-safe work order list |
| `/installer/work-orders/[id]` | Installer-safe work order detail and verification checklist |

### PDF Routes

| Route | Purpose |
| --- | --- |
| `/api/invoices/[id]/pdf` | Generate/download pro-forma invoice PDF |

## Business Logic

### Load Audit Calculator

The calculator determines:

- total running watts
- daily energy consumption in Wh and kWh
- backup energy requirement
- suggested inverter size
- suggested battery capacity
- suggested solar panel array size
- system category
- warning flags

Admins can manually override calculator results while preserving override notes and calculation snapshots.

### Recommendation Engine

The recommendation engine returns:

- best budget option
- best value option
- best premium option

Recommendations are based on editable research and equipment fields:

- customer budget
- load requirement
- stock availability
- warranty
- vendor reliability
- local support
- compatibility
- installer feedback
- price
- admin scoring

Final brand rankings, final prices, and final equipment choices are not hardcoded.

### Quote Rules

A quote can only be generated when:

- customer data is complete
- load data exists
- vendor price exists
- stock status exists
- installer verification is completed or explicitly marked as required
- admin approves final quote

### Invoice Rules

- Generate pro-forma invoices first.
- Final invoices should come after payment confirmation and final equipment availability check.
- The invoice must include Altara branding, client details, quote number, invoice date, expiry date, system recommendation, equipment list, labor/logistics, total amount, payment terms, warranty notes, and disclaimer.

### Installer Visibility Rules

Installer can see:

- customer location
- approved installation scope
- appliance/load summary
- site photos
- verification checklist
- installation notes
- work order
- assigned timeline

Installer must not see:

- Altara profit
- cost price
- vendor margin
- full customer financial data
- full pricing logic

## Implementation Plan

### Phase 1 - Foundation

1. Scaffold the Next.js application.
2. Configure TypeScript, Tailwind CSS, and reusable shadcn/ui-style components.
3. Add Prisma and PostgreSQL configuration.
4. Add NextAuth credentials authentication.
5. Define private user roles: admin and installer.

### Phase 2 - Database

1. Create Prisma models for leads, appliances, audits, verification, equipment, vendors, research, quotes, invoices, work orders, maintenance, notes, and activity logs.
2. Add enums for statuses, equipment categories, stock status, budget levels, quote status, invoice status, payment structure, source type, confidence level, and difficulty rating.
3. Add editable placeholder seed data.
4. Generate the Prisma client.

### Phase 3 - Customer Side

1. Build the landing page.
2. Build the Solar Readiness Check form.
3. Add appliance entry fields.
4. Add roof, wiring, and inverter/battery location image uploads.
5. Validate submissions with Zod.
6. Save lead, appliances, uploads, and initial load audit.
7. Show the customer confirmation message.

### Phase 4 - Admin Dashboard

1. Build the secure login page.
2. Build protected admin layout/navigation.
3. Build dashboard metrics.
4. Build lead list and pipeline filtering.
5. Build lead detail page.

### Phase 5 - Load Audit Calculator

1. Implement formula-based appliance load calculation.
2. Calculate running watts, daily Wh/kWh, and backup requirement.
3. Suggest inverter, battery, and solar array sizing.
4. Assign system category.
5. Generate warning flags.
6. Allow admin manual override with notes.

### Phase 6 - Equipment, Vendor, and Research Modules

1. Build editable equipment database.
2. Build editable vendor database.
3. Build source register.
4. Build vendor price desk.
5. Build research notes area.
6. Connect recommendation scoring to editable equipment/research fields.

### Phase 7 - Verification and Photo Review

1. Build site inspection form.
2. Build installer verification checklist.
3. Build photo review module.
4. Add future AI analysis placeholder fields.
5. Enforce installer visibility restrictions.

### Phase 8 - Quote Builder

1. Build quote creation form.
2. Add equipment selection.
3. Add labor, transport, inspection fee, Altara management fee, profit margin, maintenance fee, discount, and VAT/tax fields.
4. Calculate totals.
5. Add deposit, balance, and milestone payment structures.
6. Enforce quote readiness rules.
7. Require admin approval before invoice generation.

### Phase 9 - Invoice Generator

1. Generate pro-forma invoices from approved quotes.
2. Add professional invoice PDF output.
3. Include Altara branding, customer details, equipment list, labor/logistics, totals, payment terms, warranty notes, and disclaimer.
4. Keep final invoice generation separate until payment confirmation and equipment availability checks are implemented.

### Phase 10 - Installer Portal

1. Build installer work order list.
2. Build installer work order detail.
3. Show only location, scope, load summary, site photos, verification checklist, notes, and timeline.
4. Hide all pricing logic, cost price, profit margin, vendor margin, and full customer financial data.

### Phase 11 - Validation

1. Run Prisma generation.
2. Run lint checks.
3. Run production build.
4. Fix type, route, and build issues.
5. Verify key customer, admin, quote, invoice, and installer workflows manually.
