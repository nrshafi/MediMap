# MediMap Product Requirements Document

**Product name:** MediMap  
**Version:** 1.0  
**Date:** 7 October 2026  
**Initial market:** Dhaka, Bangladesh  
**Project type:** Web application  
**Product category:** Healthcare diagnostic-service discovery and price-comparison platform

---

# 1. Product summary

MediMap is a web-based platform that helps people find and compare diagnostic services offered by hospitals, diagnostic centers, laboratories, imaging centers, and other diagnostic facilities.

Users search for a diagnostic service such as CBC, MRI Brain, X-ray Chest, Thyroid Profile, CT Scan, or another diagnostic procedure. MediMap understands alternative names, abbreviations, and common search terms and connects them to a standardized diagnostic-service catalog.

For each diagnostic service, users can discover nearby providers, view branch-specific base prices, compare providers, check ratings and reviews, see opening hours, estimate travel distance and time, view price statistics, and access contact information.

The initial release focuses only on diagnostic services in Dhaka.

MediMap does not provide hospital-care discovery for ICU, emergency departments, surgery, hospital admission, beds, or similar clinical services.

---

# 2. Vision

Make diagnostic-service pricing and availability easier to understand and compare so that people can make better-informed decisions before visiting a healthcare provider.

The long-term vision is to improve diagnostic-price transparency and make diagnostic-service information easier to access in Bangladesh.

---

# 3. Problem statement

Finding diagnostic-service information in Bangladesh is fragmented.

Patients often need to:

- Visit multiple hospital websites
- Call providers individually
- Ask friends or relatives
- Visit facilities physically
- Search social media
- Compare unclear or outdated price lists
- Guess which provider is nearby
- Search using inconsistent diagnostic-service names

The same diagnostic test can appear under multiple names or abbreviations.

For example:

- CBC
- Complete Blood Count
- CBC Test
- Complete Blood Picture
- Full Blood Count

Different branches of the same provider may also have different prices.

There is currently no simple way for a user to search for a diagnostic service and simultaneously compare:

- Price
- Provider
- Branch
- Distance
- Travel time
- Ratings
- Opening hours
- Price freshness
- Contact information

MediMap aims to solve this problem.

---

# 4. Product goals

## 4.1 Primary goals

MediMap should allow users to:

1. Search diagnostic services easily.
2. Find diagnostic-service providers in Dhaka.
3. Understand alternative names and abbreviations.
4. View branch-specific diagnostic-service prices.
5. Compare providers using meaningful decision factors.
6. See price statistics for a diagnostic service.
7. Find providers within a selected distance.
8. Estimate actual travel distance and travel time.
9. View service-specific ratings and reviews.
10. Check provider contact information and opening hours.
11. understand how recently pricing data was verified.
12. Report incorrect or outdated information.

---

# 5. Non-goals

The initial MediMap version will not provide:

- ICU discovery
- Emergency-service discovery
- Surgery pricing
- Hospital admission information
- Bed availability
- Doctor consultation booking
- Doctor discovery
- Medicine-price comparison
- Ambulance booking
- Online diagnostic appointment booking
- Online payments
- Medical diagnosis
- Treatment recommendations
- Medical advice
- Provider self-service dashboard
- Provider accounts
- Insurance integration
- Full nationwide coverage

MediMap must not imply that a cheaper or higher-rated diagnostic provider is medically more appropriate for a patient.

---

# 6. Target users

MediMap serves several user groups.

## 6.1 Patients

People who need a diagnostic test or procedure.

Example:

A doctor recommends an MRI Brain. The patient searches MediMap to compare nearby providers.

## 6.2 Family members and caregivers

People searching for diagnostic services on behalf of another person.

## 6.3 Doctors and healthcare professionals

Doctors may use MediMap when helping patients identify diagnostic facilities.

MediMap should not attempt to replace clinical judgment.

## 6.4 General healthcare consumers

People researching diagnostic pricing or nearby facilities before deciding where to go.

---

# 7. Geographic scope

The first version covers:

**Dhaka, Bangladesh**

The system architecture should avoid assumptions that permanently prevent expansion to other cities.

Possible future expansion:

- Chattogram
- Sylhet
- Rajshahi
- Khulna
- Other Bangladeshi cities

---

# 8. Provider scope

MediMap may include diagnostic services offered by:

- Hospitals
- Diagnostic centers
- Medical laboratories
- Pathology laboratories
- Imaging centers
- Specialized diagnostic facilities

Hospitals can be listed, but only their relevant diagnostic services belong in MediMap.

Example:

A hospital may offer:

- MRI
- CT Scan
- X-ray
- CBC
- ECG

These may appear on MediMap.

The hospital's:

- ICU
- Surgery
- Emergency department
- Inpatient services

must not be included as searchable MediMap services.

---

# 9. Diagnostic-service scope

MediMap should eventually support all diagnostic services available through included providers.

Possible high-level categories include:

- Laboratory tests
- Hematology
- Biochemistry
- Immunology
- Hormone tests
- Microbiology
- Molecular diagnostics
- Pathology
- Radiology
- X-ray
- Ultrasound
- MRI
- CT Scan
- Mammography
- ECG
- Echocardiography
- Cardiac diagnostic tests
- Pulmonary diagnostic tests
- Endoscopy-related diagnostics
- Neurological diagnostics
- Specialized diagnostic procedures

The category system should remain extensible.

---

# 10. Core product flow

The primary MediMap experience is:

**Search diagnostic service**

↓

**MediMap understands aliases and finds the canonical service**

↓

**Choose or detect location**

↓

**Select distance radius**

↓

**View nearby providers offering the service**

↓

**See branch-specific base prices**

↓

**View price statistics**

↓

**Compare providers**

↓

**View charts and detailed analysis**

↓

**Inspect service/provider details**

↓

**Read ratings and reviews**

↓

**Check contact details and opening hours**

↓

**Contact provider or get directions**

↓

**Report incorrect information if necessary**

---

# 11. Service catalog architecture

One of MediMap's most important components is the standardized diagnostic-service catalog.

## 11.1 Canonical service

Each diagnostic service should have one standardized MediMap identity.

Example:

**Canonical service name:**  
Complete Blood Count

Possible identifier:

`complete-blood-count`

---

## 11.2 Service aliases

Each canonical service can have multiple aliases.

Example:

Canonical service:

**Complete Blood Count**

Aliases:

- CBC
- CBC Test
- Complete Blood Count Test
- Full Blood Count
- Blood CBC

Searching any of these should return the canonical service.

---

## 11.3 Provider-specific service name

Providers may use a different name in their price lists.

Example:

MediMap canonical service:

**Complete Blood Count**

Provider listing:

**CBC with ESR**

Provider naming should be stored separately from the canonical MediMap name where appropriate.

---

# 12. Service variants

Meaningfully different diagnostic procedures should generally be represented as separate services rather than using a complicated pricing-variation system.

Example:

- MRI Brain
- MRI Brain with Contrast
- MRI Brain without Contrast

Similarly:

- CT Abdomen
- CT Abdomen with Contrast
- CT Abdomen without Contrast

This approach should keep both the user interface and database easier to understand.

---

# 13. Search requirements

Search is a core MediMap feature.

## 13.1 Search should support

- Exact service names
- Partial names
- Abbreviations
- Common aliases
- Provider terminology
- Common spelling variations
- Minor typing errors
- Keyword matching

Example:

A search for:

`CBC`

should find:

**Complete Blood Count**

---

## 13.2 Search suggestions

As the user types, MediMap should display relevant service suggestions.

Example:

User types:

`thy`

Possible suggestions:

- Thyroid Profile
- TSH
- T3
- T4
- FT3
- FT4

---

## 13.3 Powerful alias search

Alias matching is part of the MVP.

Search should prioritize:

1. Exact canonical match
2. Exact alias match
3. Prefix match
4. Keyword match
5. Fuzzy spelling match

The exact technical implementation can change depending on the chosen technology.

---

# 14. Search result filters

Users should be able to filter results using:

## Distance

- Within 1 km
- Within 3 km
- Within 5 km
- Custom radius

## Price

Optional range:

- Minimum price
- Maximum price

## Rating

Possible options:

- 4.0+
- 3.0+
- Any rating

## Open status

- Open now
- Any

## Data verification

Possible filters:

- Verified price
- All listings

Filters should remain simple enough that new users can understand them immediately.

---

# 15. Location system

Users must have three ways to provide location.

## 15.1 Current location

With user permission, MediMap can use browser/device location.

## 15.2 Manual map or area selection

Users can manually choose an area.

Example:

- Dhanmondi
- Mirpur
- Uttara
- Mohammadpur
- Banani

## 15.3 Typed location

Users can search for or enter a location.

---

# 16. Distance and travel information

Straight-line distance should not be the primary distance shown to users.

MediMap should prefer:

- Road distance
- Estimated travel time

A mapping/routing service such as Google Maps or another suitable mapping provider may be used.

Example:

**Distance:** 4.7 km  
**Estimated travel time:** 24 minutes

Travel estimates should be presented as estimates, not guarantees.

---

# 17. Provider and branch model

A provider may have multiple branches.

Example:

**Provider:** Example Diagnostic Center

Branches:

- Dhanmondi
- Uttara
- Mirpur

Each branch should be treated as a distinct physical location.

Branch-specific information may include:

- Address
- Coordinates
- Opening hours
- Phone numbers
- Services
- Prices
- Ratings
- Travel information

---

# 18. Pricing model

MediMap stores the standard/base price charged by a provider for a diagnostic service.

Promotional pricing is excluded from the initial scope.

Examples excluded:

- Temporary discounts
- Promotional offers
- Credit-card discounts
- Campaign discounts
- Membership discounts

---

# 19. Branch-specific pricing

Prices are stored at the branch level.

Example:

| Provider | Branch | Service | Base price |
|---|---|---|---:|
| Provider A | Dhanmondi | MRI Brain | ৳6,000 |
| Provider A | Uttara | MRI Brain | ৳6,500 |
| Provider B | Mirpur | MRI Brain | ৳5,500 |

If all branches use the same price, the system may internally reuse the value while still presenting it correctly for each branch.

---

# 20. Price metadata

Each price record should contain enough information to evaluate its reliability.

Recommended fields:

- Price
- Currency
- Provider
- Branch
- Diagnostic service
- Source type
- Source reference
- Date collected
- Date last verified
- Verification status
- Person/team member who collected it
- Notes
- Active/inactive status

Currency for the initial version:

**Bangladeshi Taka, BDT**

Display symbol:

**৳**

---

# 21. Price sources

MediMap will gather information from a combination of sources.

Priority order:

### 1. Provider official sources

Examples:

- Official website
- Official published price list
- Official document

### 2. Physical verification

MediMap team members may visit providers and collect price lists or confirm information.

### 3. Trusted crowdsourcing

Trusted contributors may collect information.

Contributors with relevant domain knowledge may assist with data collection.

Crowdsourced information should retain information about who collected it and where it came from.

---

# 22. Price verification status

Recommended statuses:

## Verified

Confirmed through an official source or reliable physical verification.

## Community reported

Collected by a contributor but not yet independently confirmed.

## Under verification

The information has been flagged or requires rechecking.

## Stale

The information has not been verified recently enough according to MediMap's freshness policy.

The freshness period should be configurable rather than permanently hard-coded.

---

# 23. Price freshness

Every price should display a freshness indicator.

Example:

**Last verified: 5 October 2026**

Users should be able to understand whether a price may have changed.

Old prices should not silently appear as current information.

---

# 24. Price statistics

MediMap should calculate useful statistics for each diagnostic service when sufficient data is available.

Statistics should include:

- Lowest listed price
- Highest listed price
- Average price
- Median price
- Number of providers included

Example:

### CBC prices in selected search area

Lowest: ৳350  
Average: ৳520  
Median: ৳500  
Highest: ৳750  
Providers compared: 14

Median should be included because extreme prices can distort the average.

---

# 25. Geographic price statistics

When possible, price statistics should respect the user's selected location and radius.

Example:

**CBC within 5 km of Dhanmondi**

instead of presenting statistics for all Dhaka unless the user requests it.

---

# 26. Price-statistics reliability

Statistics should preferably use active and sufficiently fresh price records.

MediMap should avoid presenting misleading statistics created from:

- Duplicate listings
- Inactive providers
- Clearly outdated prices
- Incorrect records

The number of providers included should be shown.

---

# 27. Provider comparison

Users should be able to select multiple providers and compare them.

The comparison system should support both:

- Quick comparison
- Detailed comparison

---

# 28. Quick comparison factors

The primary factors should include:

- Base price
- Road distance
- Estimated travel time
- Service rating
- Provider/branch rating
- Opening status
- Opening hours
- Price verification status
- Last verified date

---

# 29. Detailed comparison factors

Where information is available, detailed comparison may include:

- Provider name
- Branch
- Service price
- Distance
- Estimated travel time
- Service rating
- Number of reviews
- Staff-behavior rating
- Waiting-time rating
- Cleanliness rating
- Value-for-money rating
- Report-delivery rating
- Opening hours
- Contact number
- Address
- Price source status
- Last price verification date
- Home sample collection availability where relevant
- Estimated or stated report delivery information where available
- Relevant service notes

Not every diagnostic service will have every field.

---

# 30. Comparison visualizations

Comparison should not rely only on a table.

MediMap should provide graphical comparisons where useful.

Recommended visualizations include:

### Price comparison

Bar chart comparing provider prices.

### Travel-time comparison

Bar chart comparing estimated travel time.

### Rating comparison

Chart comparing ratings.

### Price-position indicator

Show whether the selected provider is:

- Below area median
- Near area median
- Above area median

Example:

**Provider price: ৳650**  
**Area median: ৳500**  
**৳150 above median**

Avoid making medical-quality conclusions based only on price.

---

# 31. Comparison narrative

MediMap may provide simple factual summaries.

Example:

> Provider A has the lowest listed price among the selected providers, while Provider B is estimated to take the least time to reach.

Another example:

> Provider C has the highest service rating but also has the highest listed price.

The system should avoid statements such as:

> Provider C is the best hospital for you.

MediMap should present evidence rather than make medical decisions.

---

# 32. Sorting

Search results should support useful sorting options.

Recommended options:

- Price: Low to high
- Price: High to low
- Nearest
- Shortest estimated travel time
- Highest service rating
- Most recently verified

A future version may support personalized ranking.

---

# 33. Ratings and reviews

Ratings should be tied to a specific:

**Provider + branch + diagnostic service**

Example:

**Provider:** Example Hospital  
**Branch:** Dhanmondi  
**Service:** MRI Brain

A user reviewing this experience should not automatically be reviewing every service at the provider.

---

# 34. Rating categories

Users should be able to provide separate ratings for:

- Service quality
- Staff behavior
- Waiting time
- Cleanliness
- Value for money
- Report-delivery experience

Use a consistent rating scale, preferably:

**1 to 5 stars**

---

# 35. Service rating

The overall service rating can be calculated from the individual rating categories.

Example:

Service quality: 4  
Staff behavior: 5  
Waiting time: 3  
Cleanliness: 4  
Value: 4  
Report delivery: 5

The product may calculate the combined score using a simple arithmetic average for the initial version.

---

# 36. Provider overall rating

A provider or branch's overall rating should be derived from ratings of diagnostic services offered at that location.

The interface should clearly distinguish:

- Service-specific rating
- Branch/provider overall rating

---

# 37. Written reviews

Users should optionally be able to provide a written review.

Reviews should focus on the actual diagnostic-service experience.

Reviews should not be presented as medical advice.

---

# 38. Review authentication

Posting a review requires a MediMap user account.

Anonymous browsing does not require an account.

---

# 39. Verified visit

Users may optionally provide evidence that they actually received the service.

Possible evidence:

- Receipt
- Invoice
- Diagnostic report header
- Other acceptable visit proof

After verification, the review can receive a:

**Verified Visit**

badge.

Providing evidence should not be mandatory for submitting a review in the MVP.

---

# 40. Review abuse prevention

The MVP should include basic protection against fake or abusive reviews.

Requirements:

- Account required
- One active review per user for a provider-branch-service combination
- Existing review can be edited
- Users can report reviews
- Administrators can hide or remove inappropriate reviews
- Basic spam protection
- Basic duplicate detection where feasible

Phone OTP verification is not required for the initial version.

---

# 41. Review moderation

Administrators should be able to:

- View reported reviews
- Hide reviews
- Restore reviews
- Remove reviews
- Review uploaded visit verification evidence
- Mark reviews as verified visits

Administrative actions should ideally be logged.

---

# 42. Report incorrect information

Every relevant listing should provide:

**Report incorrect information**

Users should be able to report problems such as:

- Incorrect price
- Service no longer available
- Wrong opening hours
- Wrong address
- Wrong phone number
- Incorrect provider information
- Duplicate listing
- Incorrect diagnostic-service mapping
- Other issue

---

# 43. Incorrect-information workflow

Recommended workflow:

**User submits report**

↓

**Report becomes pending**

↓

**Admin reviews report**

↓

**Information is verified**

↓

**Record is updated or report rejected**

↓

**Verification history is retained**

Users do not directly modify official MediMap data.

---

## Report access decision

The owner approved signed-in reporting on 28 October 2026, with five reports per account in a rolling 24 hours.
Allow one pending report per account, target, and issue type.

## Price-report status decision

Price-report policy confirmed on 28 October 2026: a pending price report immediately marks the current price disputed.
Resolution policy confirmed on 28 October 2026: require fresh official-source review before restoring verified status, including report rejection.
Keep the current price disputed while any other price report for that listing remains pending.
Disputed prices are excluded from default statistics. Preserve source and verification history until administrator resolution.

# 44. Opening hours

Each branch should support structured opening hours.

Example:

Sunday: 7:00 AM to 10:00 PM  
Monday: 7:00 AM to 10:00 PM

The interface may display:

- Open now
- Closed
- Opens at 7:00 AM
- Closing soon

When reliable information is unavailable, MediMap should say so instead of assuming.

---

# 45. Contact information

Branch information may include:

- Primary phone number
- Alternative phone number
- Website
- Address

Users should have convenient actions such as:

- Call
- Open website
- Get directions

---

# 46. Provider-detail page

Each provider branch should have a dedicated detail page containing:

- Provider name
- Branch name
- Address
- Map
- Contact information
- Opening hours
- Overall rating
- Diagnostic services
- Service-specific prices
- Review summary
- Individual reviews
- Price verification information
- Report incorrect information action

---

# 47. Service-detail page

Each canonical diagnostic service should have a page containing:

- Canonical service name
- Alternative names
- Category
- Search location
- Available providers
- Prices
- Price statistics
- Filters
- Sorting
- Map results
- Comparison option

---

# 48. Search-results presentation

Search results should show enough information for fast decision-making.

Recommended card information:

**Provider name**  
Branch  
Price  
Distance  
Travel time  
Service rating  
Review count  
Open/closed status  
Price verification status  
Last verified date

Primary actions:

- View details
- Compare
- Directions
- Call

---

# 49. Map view

Users should be able to see relevant branches on a map.

The map should correspond to the current:

- Service
- Search location
- Distance filter
- Other active filters

Clicking a map marker should reveal basic provider information.

---

# 50. List and map relationship

The map and result list should represent the same result set.

Applying a filter should update both.

---

# 51. User accounts

An account is required for actions such as:

- Writing reviews
- Editing reviews
- Reporting reviews
- Potential future saved items

Browsing and comparing diagnostic services should not require an account.

---

# 52. Administrator system

Although providers will not receive dashboards in the current version, MediMap needs an internal administration system.

Administrators should be able to manage:

- Providers
- Branches
- Diagnostic categories
- Canonical services
- Service aliases
- Provider-service mappings
- Prices
- Price sources
- Verification statuses
- Opening hours
- Contact information
- Reviews
- Incorrect-information reports
- Verification evidence
- Users where necessary

---

# 53. Data import

Because MediMap may contain many diagnostic services, administrators should not be forced to enter everything manually one record at a time.

The system should ideally support structured bulk import.

Possible format:

- CSV
- Spreadsheet import

This is especially useful for hospital price lists.

---

# 54. Data model

The following conceptual entities are recommended.

## User

Stores user-account information.

## Provider

Represents the parent healthcare organization.

## Branch

Represents one physical provider location.

## DiagnosticCategory

Represents service categories.

## DiagnosticService

Represents a canonical MediMap service.

## ServiceAlias

Stores alternative names for diagnostic services.

## BranchService

Represents a service offered at a specific branch.

## PriceRecord

Stores branch-specific pricing and verification information.

## PriceSource

Stores where pricing information came from.

## Review

Stores user reviews.

## ReviewRating

Stores individual rating dimensions where implemented separately.

## ReviewVerification

Stores verified-visit status.

## IncorrectInformationReport

Stores user-submitted data issues.

## OpeningHours

Stores branch opening times.

---

# 55. Key entity relationships

Conceptually:

**Provider**

has many

**Branches**

A branch offers many:

**Diagnostic Services**

through:

**Branch Services**

Each branch service may have:

**Price Records**

A diagnostic service may have many:

**Aliases**

Users may create:

**Reviews**

for a:

**Branch Service**

Users may also create:

**Incorrect Information Reports**

for relevant records.

---

# 56. Example service data

Example canonical record:

**Service ID:** DS001  
**Canonical name:** Complete Blood Count  
**Category:** Hematology

Aliases:

- CBC
- Complete Blood Count Test
- Full Blood Count
- CBC Test

Provider-specific listing:

**Provider:** Example Diagnostic Center  
**Branch:** Dhanmondi  
**Provider service name:** CBC  
**Base price:** ৳500  
**Verification status:** Verified  
**Last verified:** 5 October 2026

---

# 57. Recommended core screens

The MVP should include the following major screens.

1. Home/Search
2. Search suggestions
3. Service search results
4. List/map result view
5. Diagnostic service details
6. Provider/branch details
7. Comparison screen
8. Review submission
9. Review listing
10. Report incorrect information
11. Login/register
12. Admin dashboard
13. Service-management interface
14. Provider/branch-management interface
15. Price-management interface
16. Review/report moderation interface

---

# 58. Home page

The main interface should strongly emphasize service search.

Primary search prompt example:

**What diagnostic service are you looking for?**

Supporting features:

- Location selector
- Use current location
- Popular/recent diagnostic searches if useful
- Service categories

Avoid cluttering the home page with unrelated healthcare information.

---

# 59. Comparison screen

The comparison screen is one of MediMap's key differentiators.

It should contain:

## Summary section

Quick side-by-side comparison.

## Price visualization

Provider-price chart.

## Travel visualization

Road distance and travel-time comparison.

## Rating visualization

Service-rating comparison.

## Price statistics

Lowest, average, median, highest.

## Detailed comparison

Structured table.

## Text analysis

Short factual summary describing important differences.

---

# 60. MVP functional priorities

Priority definitions:

**P0:** Required for the initial product to fulfill its purpose.  
**P1:** Important and should be included if practical.  
**P2:** Valuable but can move to later development.

---

## P0 requirements

- Diagnostic-service catalog
- Alias system
- Service search
- Powerful alias matching
- Dhaka provider database
- Provider branches
- Branch-specific base prices
- Price source tracking
- Verification status
- Last verified date
- Current/manual/typed location
- 1 km, 3 km, 5 km, custom radius
- Actual road distance where API allows
- Estimated travel time
- Search result list
- Provider detail page
- Service detail page
- Provider comparison
- Price comparison chart
- Price statistics
- Contact details
- Opening hours
- Ratings
- Written reviews
- User authentication for reviews
- Report incorrect information
- Admin data management

---

## P1 requirements

- Verified Visit review badge
- Review subratings
- Review reporting
- Detailed rating visualization
- Median-relative price information
- Open now filter
- Price filter
- Rating filter
- Map result view
- CSV/spreadsheet data import

---

## P2 requirements

- Advanced typo correction
- Personalized ranking
- Saved/favorite providers
- Advanced review fraud detection
- Provider dashboards
- Automated price monitoring
- Appointment booking
- Notifications
- Nationwide expansion

---

# 61. Non-functional requirements

## Performance

Common search pages should load quickly on typical mobile and broadband connections in Bangladesh.

Search interactions should feel responsive.

## Mobile usability

The application should work well on:

- Smartphones
- Tablets
- Laptops
- Desktop computers

Mobile experience is especially important.

## Accessibility

The interface should aim for:

- Clear typography
- Keyboard accessibility
- Meaningful labels
- Sufficient contrast
- Understandable error states

## Reliability

Core search and pricing data should remain available even if secondary integrations fail.

Example:

If the routing API fails, users should still be able to view:

- Provider
- Address
- Price
- Rating

## Scalability

The architecture should allow expansion beyond Dhaka without redesigning the entire data model.

---

# 62. Security requirements

The product should implement reasonable security for the initial application.

Requirements include:

- Secure password storage
- Authentication protection
- Authorization for admin functionality
- Server-side input validation
- Protection against common web vulnerabilities
- Safe file handling for verification uploads
- Rate limiting where appropriate
- Review/report abuse protection

Administrative routes must not be accessible to ordinary users.

---

# 63. Privacy requirements

MediMap should minimize unnecessary personal-data collection.

Location should be requested only when needed.

Users should be able to use a manually selected location instead of sharing current location.

Uploaded visit evidence may contain sensitive information.

The system should:

- Restrict administrator access
- Avoid displaying uploaded evidence publicly
- Store only what is necessary
- Delete verification files when they are no longer required where practical
- Avoid using report contents for unrelated purposes

---

# 64. Medical-safety boundary

MediMap is a discovery and comparison platform.

It does not:

- Diagnose diseases
- Recommend medical treatment
- Replace medical professionals
- Determine which test someone needs
- Determine whether a diagnostic result is correct

A user searching for a service should already know what service they are looking for or be exploring available diagnostic options.

---

# 65. Data-quality principles

MediMap's value depends heavily on data quality.

Important principles:

1. Never hide the age of pricing information.
2. Keep provider and branch information separate.
3. Keep canonical service names separate from provider naming.
4. Preserve the original data source.
5. Allow corrections.
6. Maintain verification history where practical.
7. Avoid presenting uncertain information as verified.

---

# 66. Data-collection workflow

Recommended process:

## Step 1: Identify provider

Create provider and branch records.

## Step 2: Gather official information

Check official websites and published price lists.

## Step 3: Normalize services

Map provider service names to MediMap canonical services.

## Step 4: Create missing canonical services

Add a new canonical service only when an appropriate service does not already exist.

## Step 5: Add aliases

Record useful alternative names.

## Step 6: Enter branch-specific prices

Associate each price with the correct branch.

## Step 7: Record source

Store collection method and reference.

## Step 8: Verify

Assign verification status.

## Step 9: Quality review

Check for duplicates and incorrect mappings.

## Step 10: Publish

Make the data searchable.

---

# 67. Data-collection priority

For the initial release, it is better to have:

**A smaller number of well-verified providers and services**

than:

**A very large database containing unreliable prices.**

Data credibility should be prioritized over raw quantity.

---

# 68. Analytics and product metrics

Useful internal metrics include:

- Number of canonical services
- Number of aliases
- Number of providers
- Number of branches
- Number of branch-service listings
- Percentage of prices verified
- Number of stale prices
- Search success rate
- Most searched services
- Searches producing zero results
- Comparison usage
- Review count
- Incorrect-information reports
- Average report-resolution time

These metrics are primarily for improving the system.

---

# 69. Search-quality metrics

Useful search evaluation measures include:

- Correct result appears for canonical name
- Correct result appears for abbreviation
- Correct result appears for alias
- Common spelling error still produces useful result
- Irrelevant results remain low

A test dataset should be created for major diagnostic services.

---

# 70. Success criteria for the initial release

The project can be considered functionally successful if a user can:

1. Search for a diagnostic service using either its standard name or common alias.
2. Select or share a location.
3. Find relevant branches within the chosen distance.
4. See branch-specific prices.
5. Understand price-verification status.
6. View price statistics.
7. Compare multiple providers.
8. View price, rating, distance, and travel information visually.
9. Read detailed provider information.
10. Read and submit service-specific reviews.
11. See opening hours and contact information.
12. Report incorrect information.
13. Use the experience comfortably from a mobile device.

---

# 71. Example acceptance scenario

A user in Dhanmondi wants a CBC test.

The user searches:

`CBC`

MediMap recognizes this as:

**Complete Blood Count**

The user chooses:

**Within 5 km**

MediMap displays branches offering the service.

Each relevant result includes:

- Provider
- Branch
- Price
- Road distance
- Travel time
- Rating
- Opening status
- Price verification

The user selects three providers.

MediMap displays:

- Price comparison chart
- Travel comparison
- Ratings
- Lowest price
- Average price
- Median price
- Highest price
- Detailed comparison
- Factual comparison summary

The user opens a provider page and checks:

- Contact information
- Opening hours
- Reviews
- Price freshness

The user can then call the provider or request directions.

This represents the core MediMap value proposition.

---

# 72. Important edge cases

The product should handle the following situations gracefully.

## No providers found

Suggest:

- Increasing search radius
- Checking another service name
- Removing filters

## Price unavailable

Display:

**Price currently unavailable**

instead of zero.

## Travel API unavailable

Continue showing available provider information.

## Provider temporarily closed

Show the appropriate availability information if known.

## Service no longer offered

Mark listing inactive rather than deleting useful historical information immediately.

## Duplicate diagnostic aliases

Ensure aliases map to the correct canonical service.

## Conflicting prices

Keep source history and verify before replacing trusted information.

## Very few price records

Avoid presenting misleading statistics.

---

# 73. Minimum data required for launch

Each active listing should ideally contain:

- Canonical service
- Provider
- Branch
- Address
- Coordinates
- Base price
- Price source
- Last verified date
- Verification status
- Contact information
- Opening hours where available

Ratings may initially be empty because they require user participation.

---

# 74. Design principles

MediMap should feel:

- Simple
- Trustworthy
- Neutral
- Easy to scan
- Data-focused
- Mobile-friendly

The interface should prioritize decision-making rather than decorative content.

Prices, distances, ratings, verification status, and important provider information should be easy to find.

---

# 75. Trust indicators

Useful trust indicators include:

**Verified Price**

**Community Reported**

**Last Verified**

**Verified Visit**

These indicators should have clear explanations so users understand what they mean.

---

# 76. What MediMap should avoid

The product should avoid:

- Overcomplicated ranking algorithms
- Hidden provider scoring
- Pretending price equals quality
- Fake precision in travel estimates
- Hiding outdated data
- Mixing hospital-care services into diagnostic search
- Requiring login before basic search
- Allowing providers to silently overwrite community information in the current initial version
- Excessive filters that make basic search confusing

---

# 77. Recommended MVP architecture principles

The PRD does not require a specific technology stack.

However, the implementation should logically separate:

- User interface
- Search logic
- Application/backend logic
- Database
- Location/routing integration
- Authentication
- Admin functions

The service catalog and branch-price model should remain independent enough to support future expansion.

---

# 78. Future opportunities

The following are intentionally outside the MVP but may be explored later.

## Provider dashboard

Verified providers could maintain:

- Prices
- Services
- Branch information
- Opening hours

## Appointment requests

Users could request diagnostic appointments.

## Price-change history

Display historical price changes.

## Alerts

Notify users when a service price changes.

## Saved services

Users could bookmark common tests.

## Personalized comparison

Users could prioritize:

- Price
- Distance
- Rating
- Travel time

## Home collection

Detailed support for laboratory home sample collection.

## Nationwide expansion

Add other districts and cities.

## Insurance

Display accepted insurance or corporate agreements.

## APIs

Expose structured diagnostic-service data to approved third parties.

---

# 79. Key product decisions already finalized

The following decisions should be treated as the current MediMap baseline:

- Initial geographic scope is Dhaka.
- MediMap covers diagnostic services only.
- Hospitals can appear only for their diagnostic offerings.
- All relevant diagnostic-provider types may be included.
- All diagnostic-service categories are in scope.
- Search supports alternative service names.
- MediMap uses canonical services with aliases.
- Meaningful diagnostic variants are separate services.
- Pricing is branch-specific.
- Only standard/base pricing is shown.
- Pricing data uses multiple sources.
- Official hospital/provider sources have highest priority.
- Physical verification is also important.
- Trusted crowdsourcing may be used.
- Price verification status is displayed.
- Last verification date is displayed.
- Users can report incorrect information.
- Users can use current location, manually selected location, or typed location.
- Default distance options are 1 km, 3 km, and 5 km.
- Custom radius is supported.
- Actual road distance and estimated travel time are preferred.
- Comparison includes detailed data, charts, and written analysis.
- Price statistics are part of the product.
- Powerful alias search is part of the product.
- Reviews are service-specific.
- Multiple rating dimensions are supported.
- Provider overall rating is derived from service-level ratings.
- Accounts are required for reviews.
- Verified Visit is supported when practical.
- Provider dashboards are excluded from the initial release.
- MediMap administrators maintain the core dataset.

---

# 80. Canonical product statement

When discussing MediMap in future conversations, the product should be understood as:

> **MediMap is a Dhaka-focused diagnostic-service discovery and price-comparison platform that lets users search standardized diagnostic services using normal names, aliases, or abbreviations; find nearby providers; view branch-specific base prices and verification information; compare providers using price, location, travel time, ratings, opening information, and price statistics; read service-specific reviews; and report incorrect information.**

---

# 81. Rule for future MediMap discussions

This document should be treated as the current baseline PRD.

When a later explicit MediMap decision conflicts with this PRD:

**The newer explicit decision should take priority.**

The PRD should then be updated to reflect the newer decision rather than maintaining contradictory requirements.

---

# 82. Short MVP definition

The shortest useful description of the MediMap MVP is:

**Search service → understand aliases → select location → find nearby providers → see branch-specific verified prices → view price statistics → compare providers using charts and detailed information → inspect provider details → read service-specific ratings and reviews → contact provider → report incorrect information.**
# 83. Context interview decisions, 8 October 2026

These newer explicit decisions take priority where earlier sections conflict.

- The required initial release includes all P0 requirements plus map results, review subratings, and review reporting.
- Verified Visit evidence and bulk import are deferred from the required release. Other P1 requirements remain optional unless explicitly selected.
- The initial dataset uses official service, standard-price, and branch-location evidence to select Dhaka hospitals and branches.
- The 27 October 2026 decision removes fixed hospital and branch counts and the complete-service coverage requirement.
- A hospital can qualify with one verified diagnostic service. Include more hospitals or branches when their information can be verified.
- Exclude hospitals and records that cannot be verified. Record partial coverage without claiming a complete hospital catalog.
- This collection policy does not remove other diagnostic-provider types from the product model.
- The current version has an English interface with English and Bangla service aliases.
- Submission is due in early December 2026. Development must finish before submission. The exact final delivery date remains open. Internal milestone dates are defined below.
- The team has three people. The project owner expects to do most implementation with AI agents.
- The selected technologies are React, TanStack, Cloudflare Workers, and Cloudflare D1. Hono is optional if required.
- The exact TanStack packages, package versions, and mapping provider remain open.
- Use free tiers first. Obtain explicit approval before enabling paid services.
- Cloudflare free tiers are the intended budget constraint. Workload suitability remains to be verified.

## Additional architecture decisions

- Use TanStack Start with React, with server rendering for public service and branch pages.
- Use one Cloudflare Workers application deployment. Keep public pages, administration, and backend logic in separate internal modules.
- Access D1 through direct prepared SQL queries and versioned SQL migrations. Do not add an ORM by default.
- Use Google sign-in only for the first version. Assign administrator access separately.
- Research mapping and routing providers before selecting one. Check Dhaka coverage, maps, typed-location lookup, road distance, travel time, and free usage.

## Additional search, price, and comparison decisions

- Straight-line radius determines which branches appear. Show road distance and travel time separately with clear labels.
- Prioritize canonical names, aliases, prefixes, and keywords. Offer typo suggestions and require selection for ambiguous matches.
- Prices never become stale because of age alone. Reports trigger review. Continue to show last verification dates.
- The configurable age-based freshness policy in sections 22, 23, and 26 is superseded by this report-based policy.
- Default statistics use one current verified non-stale price per active branch-service listing in the selected area.
- Show eligible branch and distinct provider counts. Require at least three eligible branches for aggregate statistics.
- Do not apply an age cutoff to statistics. Pending price reports immediately mark prices disputed and exclude them from default statistics.
- Present written comparison details in tables. Use statistics for numerical values only.
- Generated narrative comparison summaries in sections 31 and 59 are excluded. Required comparison charts remain in scope.

## Development and delivery decisions

- Complete one small feature across database, backend, UI, and tests before starting the next.
- Proceed with routine implementation. Ask about ambiguous behavior, scope changes, paid services, destructive actions, and production deployment.
- Work on the current branch. Commit or push only when requested.
- Prefer existing packages. Verify documentation, compatibility, and maintenance before adding a necessary dependency. Explain the choice.
- Target core features for 15 November 2026, dataset and full-flow checks for 22 November, and a release candidate for 29 November.
- Keep prose product-focused and omit academic references.

