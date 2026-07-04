# Entity Relationship Diagram

## Core Entities

### associates
| Column             | Type         | Notes                     |
|--------------------|--------------|---------------------------|
| id                 | uuid PK      |                           |
| user_id            | uuid FK      | References auth.users     |
| slug               | text         | Unique URL slug           |
| status             | text         | draft, pending_review, active, inactive, suspended |
| submitted_at       | timestamptz  |                           |
| approved_at        | timestamptz  |                           |
| approved_by        | uuid         | Admin user ID             |
| is_profile_complete| boolean      | Derived                   |
| created_at         | timestamptz  |                           |
| updated_at         | timestamptz  |                           |

### associate_profiles
| Column       | Type        | Notes                    |
|--------------|-------------|--------------------------|
| id           | uuid PK     |                          |
| associate_id | uuid FK     | Unique, references associates |
| full_name    | text        |                          |
| headline     | text        | Professional title       |
| bio          | text        |                          |
| phone        | text        |                          |
| date_of_birth| text        |                          |
| gender       | text        |                          |
| nationality  | text        |                          |
| photo_url    | text        |                          |
| created_at   | timestamptz |                          |
| updated_at   | timestamptz |                          |

### associate_experiences
| Column       | Type    | Notes             |
|--------------|---------|-------------------|
| id           | uuid PK |                   |
| associate_id | uuid FK |                   |
| company      | text    |                   |
| position     | text    |                   |
| description  | text    |                   |
| start_date   | text    |                   |
| end_date     | text    |                   |
| is_current   | boolean |                   |
| order_index  | integer |                   |

### associate_educations
| Column        | Type    | Notes |
|---------------|---------|-------|
| id            | uuid PK |       |
| associate_id  | uuid FK |       |
| institution   | text    |       |
| degree        | text    |       |
| field_of_study| text    |       |
| start_year    | integer |       |
| end_year      | integer |       |
| gpa           | text    |       |
| order_index   | integer |       |

### associate_certifications
| Column         | Type    | Notes |
|----------------|---------|-------|
| id             | uuid PK |       |
| associate_id   | uuid FK |       |
| name           | text    |       |
| issuer         | text    |       |
| issue_date     | text    |       |
| expiry_date    | text    |       |
| credential_id  | text    |       |
| credential_url | text    |       |
| order_index    | integer |       |

### associate_portfolios
| Column       | Type        | Notes           |
|--------------|-------------|-----------------|
| id           | uuid PK     |                 |
| associate_id | uuid FK     |                 |
| title        | text        |                 |
| description  | text        |                 |
| client_name  | text        |                 |
| project_url  | text        |                 |
| start_date   | text        |                 |
| end_date     | text        |                 |
| skills_used  | jsonb       | Array of strings |
| order_index  | integer     |                 |

### associate_skills
| Column           | Type    | Notes |
|------------------|---------|-------|
| id               | uuid PK |       |
| associate_id     | uuid FK |       |
| skill_name       | text    |       |
| category         | text    |       |
| proficiency      | text    |       |
| years_experience | integer |       |

### associate_languages
| Column       | Type    | Notes |
|--------------|---------|-------|
| id           | uuid PK |       |
| associate_id | uuid FK |       |
| language     | text    |       |
| proficiency  | text    |       |

### associate_availability
| Column               | Type        | Notes           |
|----------------------|-------------|-----------------|
| id                   | uuid PK     |                 |
| associate_id         | uuid FK     | Unique          |
| status               | text        |                 |
| max_hours_per_week   | integer     |                 |
| preferred_work_type  | jsonb       | Array of strings |
| travel_willingness   | text        |                 |
| available_from       | text        |                 |
| notes                | text        |                 |

### associate_social_links
| Column       | Type    | Notes |
|--------------|---------|-------|
| id           | uuid PK |       |
| associate_id | uuid FK |       |
| platform     | text    |       |
| url          | text    |       |
| is_primary   | boolean |       |

### associate_emergency_contacts
| Column       | Type    | Notes |
|--------------|---------|-------|
| id           | uuid PK |       |
| associate_id | uuid FK |       |
| name         | text    |       |
| relationship | text    |       |
| phone        | text    |       |
| email        | text    |       |
| is_primary   | boolean |       |

### associate_preferences
| Column                 | Type    | Notes |
|------------------------|---------|-------|
| id                     | uuid PK |       |
| associate_id           | uuid FK | Unique |
| locale                 | text    |       |
| email_notifications    | boolean |       |
| whatsapp_notifications | boolean |       |
| profile_visibility     | text    |       |

### associate_documents
| Column       | Type        | Notes                    |
|--------------|-------------|--------------------------|
| id           | uuid PK     |                          |
| associate_id | uuid FK     | References associates    |
| type         | text        | cv, certificate, other   |
| name         | text        | Original filename         |
| url          | text        | Storage URL              |
| parsed_data  | jsonb       | AI-extracted data         |
| created_at   | timestamptz |                          |

### reviews
| Column       | Type        | Notes                    |
|--------------|-------------|--------------------------|
| id           | uuid PK     |                          |
| associate_id | uuid FK     |                          |
| reviewer_id  | uuid FK     | Admin user               |
| status       | text        | pending, approved, rejected |
| notes        | text        |                          |
| created_at   | timestamptz |                          |

### projects (future)
### assignments (future)
