# Infrastructure Settings Implementation Guide (L90)

## Overview
This document outlines the implementation details for all Infrastructure Settings features accessible to Level 90 (System Admin) users.

---

## Current Status

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Maintenance Mode | ✅ **Complete** | `enable_maintenance_mode()`, `disable_maintenance_mode()`, `is_maintenance_mode()` | Toggle in header | Fully operational |
| Master Auth Override | 🔧 **Planned** | Need RPC + table | Button exists (mock) | Force logout non-L90 |
| Database Read-Only | 🔧 **Planned** | Need triggers/policy | Buttons exist (mock) | Block mutations |
| Reset Master Secret | 🔧 **Planned** | Need Supabase API | Button exists (mock) | Rotate JWT secret |
| Node Health Metrics | ✅ **Mock** | Static data | Progress bars | Visual only |
| Network Protocols | ✅ **Mock** | Static data | Checkmarks | Visual only |
| Supabase Stats | ✅ **Live** | Supabase API | Cards display | DB/Storage/Status |

---

## Implemented Features

### 1. Maintenance Mode

#### Database Schema
```sql
-- Added to school_settings table
ALTER TABLE public.school_settings 
  ADD COLUMN maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN maintenance_message text DEFAULT 'The system is currently under maintenance.',
  ADD COLUMN maintenance_started_at timestamptz;
```

#### Backend Functions
```sql
-- Check maintenance status
CREATE FUNCTION public.is_maintenance_mode() RETURNS boolean;

-- Enable (L90 only)
CREATE FUNCTION public.enable_maintenance_mode(p_message text DEFAULT NULL) RETURNS void;

-- Disable (L90 only)
CREATE FUNCTION public.disable_maintenance_mode() RETURNS void;
```

#### Frontend Implementation
**Location:** `src/pages/sysadmin/Settings.tsx` (header toggle)

```typescript
// Data fetching
const fetchMaintenanceStatus = async () => {
  const { data } = await supabase
    .from('school_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .single();
  setMaintenanceMode(data?.maintenance_mode || false);
};

// Toggle function
const toggleMaintenanceMode = async () => {
  if (newState) {
    await supabase.rpc('enable_maintenance_mode', {
      p_message: 'The system is currently under maintenance...'
    });
  } else {
    await supabase.rpc('disable_maintenance_mode');
  }
};
```

#### Guard Implementation
**Location:** `src/components/auth/MaintenanceGuard.tsx`

```typescript
const handleMaintenanceChange = (isMaintenance: boolean) => {
  const isL90 = authoritativeRole === 'system_admin';
  
  if (isMaintenance && !isL90) {
    navigate('/maintenance', { replace: true });
  }
};
```

#### Maintenance Page
**Location:** `src/pages/Maintenance.tsx`
- Displays maintenance message
- Shows duration since maintenance started
- Polls every 30 seconds for status change
- Auto-redirects to `/login` when maintenance ends

---

## Planned Features (To Implement)

### 2. Master Auth Override

#### Purpose
Force-logout all non-L90 users immediately. Useful for security incidents or emergency maintenance.

#### Required Implementation

**New Table:**
```sql
CREATE TABLE public.auth_session_lockdown (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_active boolean NOT NULL DEFAULT false,
  initiated_by uuid REFERENCES auth.users(id),
  initiated_at timestamptz DEFAULT now(),
  reason text,
  affected_roles text[] DEFAULT ARRAY['student', 'staff', 'academic_admin']
);
```

**Backend Functions:**
```sql
-- Engage lockdown (L90 only)
CREATE FUNCTION public.engage_auth_override(p_reason text DEFAULT NULL)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_role_level(public.get_user_role(auth.uid())) < 90 THEN
    RAISE EXCEPTION 'L90 required';
  END IF;
  
  UPDATE auth_session_lockdown 
  SET is_active = true, 
      initiated_by = auth.uid(),
      initiated_at = now(),
      reason = p_reason
  WHERE id = 1;
  
  -- Log action
  INSERT INTO audit_logs (actor_id, action, table_name, details)
  VALUES (auth.uid(), 'ENGAGE_LOCKDOWN', 'auth_session_lockdown', 
          jsonb_build_object('reason', p_reason));
END;
$$;

-- Release lockdown (L90 only)
CREATE FUNCTION public.release_auth_override()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_role_level(public.get_user_role(auth.uid())) < 90 THEN
    RAISE EXCEPTION 'L90 required';
  END IF;
  
  UPDATE auth_session_lockdown 
  SET is_active = false, 
      initiated_by = NULL,
      initiated_at = NULL,
      reason = NULL
  WHERE id = 1;
END;
$$;

-- Check if user is locked out
CREATE FUNCTION public.is_session_locked_out(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth_session_lockdown 
    WHERE id = 1 
    AND is_active = true
    AND public.get_user_role(p_user_id) = ANY(affected_roles)
  );
$$;
```

**Frontend Implementation:**
```typescript
// In Settings.tsx
const engageOverride = async () => {
  const { error } = await supabase.rpc('engage_auth_override', {
    p_reason: 'Security incident response'
  });
  
  if (error) {
    toast.error('Failed: ' + error.message);
    return;
  }
  
  toast.success('Master Auth Override engaged. All non-L90 sessions suspended.');
  setLockdownStatus(true);
};
```

**Guard Integration:**
```typescript
// Add to MaintenanceGuard.tsx or create new LockdownGuard
const checkLockdown = async () => {
  const { data } = await supabase.rpc('is_session_locked_out', {
    p_user_id: user?.id
  });
  
  if (data && !isL90) {
    navigate('/session-suspended', { replace: true });
  }
};
```

---

### 3. Database Read-Only Mode

#### Purpose
Prevent all data modifications system-wide while keeping read access available. Useful for backups, migrations, or investigations.

#### Required Implementation

**Approach 1: Global Flag (Recommended)**
```sql
-- Add to school_settings
ALTER TABLE public.school_settings 
  ADD COLUMN read_only_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN read_only_reason text;

-- Function to check
CREATE FUNCTION public.is_read_only_mode()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(read_only_mode, false) 
  FROM public.school_settings 
  WHERE id = 1;
$$;

-- Enable/Disable (L90 only)
CREATE FUNCTION public.enable_read_only_mode(p_reason text)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_role_level(public.get_user_role(auth.uid())) < 90 THEN
    RAISE EXCEPTION 'L90 required';
  END IF;
  
  UPDATE school_settings 
  SET read_only_mode = true, 
      read_only_reason = p_reason,
      updated_at = now()
  WHERE id = 1;
END;
$$;

CREATE FUNCTION public.disable_read_only_mode()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_role_level(public.get_user_role(auth.uid())) < 90 THEN
    RAISE EXCEPTION 'L90 required';
  END IF;
  
  UPDATE school_settings 
  SET read_only_mode = false, 
      read_only_reason = NULL,
      updated_at = now()
  WHERE id = 1;
END;
$$;
```

**Approach 2: Middleware/Guard (Application Level)**
```typescript
// Create ReadOnlyGuard component
const ReadOnlyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  useEffect(() => {
    checkReadOnlyStatus();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('read_only_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'school_settings',
        filter: 'id=eq.1'
      }, (payload) => {
        setIsReadOnly(payload.new.read_only_mode);
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, []);
  
  if (isReadOnly) {
    return <ReadOnlyBanner reason={readOnlyReason} />;
  }
  
  return <>{children}</>;
};
```

**Note:** RLS enforcement via `is_read_only_mode()` function would require modifying every RLS policy. Application-level guard is simpler.

---

### 4. Reset Master Secret

#### Purpose
Rotate the Supabase JWT secret, forcing all users to re-authenticate. Nuclear option for security breaches.

#### Required Implementation

**Important:** This requires Supabase Management API, not database functions.

```typescript
// Frontend only - requires SUPABASE_ACCESS_TOKEN
const rotateJwtSecret = async () => {
  const confirm = window.confirm(
    'WARNING: This will force ALL users to log in again. Continue?'
  );
  
  if (!confirm) return;
  
  try {
    // Requires Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secrets: [{ name: 'JWT_SECRET', value: generateSecureSecret() }]
        })
      }
    );
    
    if (response.ok) {
      toast.success('Master secret rotated. All sessions invalidated.');
    }
  } catch (error) {
    toast.error('Failed: ' + error.message);
  }
};
```

**Alternative:** Document this as a **manual procedure** requiring CLI access:
```bash
supabase secrets set JWT_SECRET=$(openssl rand -base64 32)
```

---

## Data Fetching Requirements

### Current Implementation

**Supabase Stats (Live Data):**
```typescript
// Database size
const { data: dbStats } = await supabase.rpc('database_size');

// Storage size
const { data: storageStats } = await supabase
  .storage.getBucket('documents');
```

**Node Health (Mock Data - Static):**
```typescript
const nodeMetrics = [
  { name: 'CPU Cluster A', status: 'STABLE', progress: 85 },
  { name: 'DB Read Replica', status: 'OPTIMAL', progress: 92 },
  { name: 'Security Gateway', status: 'HIGH LOAD', progress: 78 },
];
```

**Network Protocols (Mock Data - Static):**
```typescript
const protocols = [
  { name: 'SSL Encryption', enabled: true },
  { name: 'HWID Authentication', enabled: true },
  { name: 'RLS Enforcement', enabled: true },
  { name: 'IP Whitelisting', enabled: false },
];
```

### Future: Live Metrics

For production, consider integrating:
- Supabase Analytics API (database metrics)
- Custom health check endpoints
- Prometheus/Grafana for node metrics

---

## UI Component Mapping

### Infrastructure Settings Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Settings          [Maintenance Mode] [Toggle] │
│ Hardware Control & Security Management (L90)                   │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐ ┌──────────────┐
│ INSTITUTIONAL NODE  │ │ NETWORK PROTOCOLS   │ │ INSTITUTIONAL│
│ HEALTH              │ │                     │ │ LOCKDOWN     │
│                     │ │ SSL Encryption ✓   │ │              │
│ CPU Cluster A ████  │ │ HWID Auth ✓        │ │ Master Auth  │
│ DB Read Replica ██  │ │ RLS Enforcement ✓  │ │ [ENGAGE]     │
│ Security Gate ████  │ │ IP Whitelist ✗     │ │              │
│                     │ │                     │ │ DB Read-Only │
└─────────────────────┘ └─────────────────────┘ │ [ENABLE]     │
                                              │              │
┌─────────────────────┐                         │ Reset Secret │
│ SUPABASE INFRA      │                         │ [RESET]      │
│                     │                         └──────────────┘
│ Database  0.034 GB  │
│ Storage   0.001 GB  │
│ Status    Healthy   │
└─────────────────────┘
```

---

## L90 Role Requirements

All infrastructure functions must enforce **Level 90 (System Admin)** access:

```sql
-- Standard check pattern
IF public.get_role_level(public.get_user_role(auth.uid())) < 90 THEN
  RAISE EXCEPTION 'Security Barrier: Level 90 required';
END IF;
```

**Role Hierarchy:**
- L90: System Admin (infrastructure control)
- L80: Academic Admin (content/staff management)
- L70: Department Approver
- L60: Executive Approver
- L10: Student
- L00: Unauthenticated

---

## Testing Checklist

### Maintenance Mode
- [ ] L90 can enable maintenance
- [ ] L90 can disable maintenance
- [ ] Student sees maintenance page when enabled
- [ ] Staff sees maintenance page when enabled
- [ ] L80 sees maintenance page when enabled
- [ ] L90 bypasses maintenance (full access)
- [ ] Maintenance page shows duration
- [ ] Auto-redirect when maintenance ends

### Master Auth Override (when implemented)
- [ ] L90 can engage override
- [ ] L90 can release override
- [ ] Non-L90 sessions are suspended
- [ ] Non-L90 users see suspension page
- [ ] Action is logged to audit_logs

### Database Read-Only (when implemented)
- [ ] L90 can enable read-only
- [ ] L90 can disable read-only
- [ ] Read operations still work
- [ ] Write operations blocked
- [ ] Banner shows to all users

### Reset Master Secret (when implemented)
- [ ] Confirmation dialog appears
- [ ] Secret is rotated
- [ ] All users forced to re-login
- [ ] Action logged

---

## Migration Order

Apply in this sequence:

1. `20260422000004_add_maintenance_mode.sql` ✅
2. `20260422000005_add_auth_override.sql` (future)
3. `20260422000006_add_read_only_mode.sql` (future)

---

## Files Modified/Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260422000004_add_maintenance_mode.sql` | Database schema |
| `src/pages/Maintenance.tsx` | Maintenance page UI |
| `src/components/auth/MaintenanceGuard.tsx` | Route protection |
| `src/pages/sysadmin/Settings.tsx` | Toggle + data fetching |
| `src/App.tsx` | Route registration + guard wrapping |

---

## Notes

- **Security:** All RPC functions use `SECURITY DEFINER` to bypass RLS
- **Audit:** Consider adding audit logging for all infrastructure actions
- **Real-time:** Guards use Supabase realtime subscriptions for instant updates
- **Bypass:** L90 always has emergency access - even during lockdowns
