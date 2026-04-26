# Admin Dashboard Rules

## Access Control

```python
# Admin-only routes — platform-wide access
@router.get("/admin/usage")
@router.get("/admin/organizations")
@router.get("/admin/users")

# Require admin role
async def require_admin(auth: AuthContext = Depends(require_auth)):
    if auth.role != "admin":
        raise HTTPException(403, "Admin access required")
    return auth
```

## Dashboard Modules

### 1. Platform Usage Analytics

```python
@router.get("/admin/usage")
async def get_usage(
    auth: AuthContext = Depends(require_admin),
    start_date: date = Query(...),
    end_date: date = Query(...),
    group_by: str = Query("day")  # day, week, month
) -> UsageAnalytics:
    return await analytics_service.get_platform_usage(
        start_date, end_date, group_by
    )
```

Response:
```json
{
  "period": {"start": "2024-01-01", "end": "2024-01-31"},
  "totals": {
    "ai_tokens": 1500000,
    "chat_messages": 25000,
    "agent_runs": 3500,
    "voice_minutes": 12000,
    "video_minutes": 4500
  },
  "by_organization": [
    {"org_id": "...", "name": "Acme Corp", "ai_tokens": 50000, ...}
  ],
  "timeseries": [
    {"date": "2024-01-01", "ai_tokens": 45000, ...}
  ]
}
```

### 2. Organization Management

```python
@router.get("/admin/organizations")
async def list_organizations(
    auth: AuthContext = Depends(require_admin),
    page: int = 1,
    limit: int = 50,
    status: str | None = None
) -> PaginatedResponse[Organization]:
    return await org_service.list_all(page, limit, status)

@router.patch("/admin/organizations/{org_id}")
async def update_organization(
    org_id: UUID,
    update: OrgAdminUpdate,  # plan, status, limits
    auth: AuthContext = Depends(require_admin)
):
    return await org_service.admin_update(org_id, update)
```

### 3. User Management

```python
@router.get("/admin/users")
async def list_users(
    auth: AuthContext = Depends(require_admin),
    page: int = 1,
    search: str | None = None
) -> PaginatedResponse[UserWithOrgs]:
    return await user_service.list_all(page, search)
```

### 4. System Health

```python
@router.get("/admin/health")
async def system_health(auth: AuthContext = Depends(require_admin)):
    return {
        "database": await check_db_health(),
        "redis": await check_redis_health(),
        "openai": await check_openai_health(),
        "vector_store": await check_vector_health(),
        "queue_depth": await get_queue_depth()
    }
```

## Frontend Dashboard Structure

```
app/(dashboard)/admin/
├── page.tsx              # Overview dashboard
├── usage/
│   └── page.tsx          # Usage analytics
├── organizations/
│   ├── page.tsx          # Org list
│   └── [id]/page.tsx     # Org detail
├── users/
│   └── page.tsx          # User list
└── system/
    └── page.tsx          # System health
```

## Dashboard Components

```typescript
// Admin usage chart
export function UsageChart({ data }: { data: UsageTimeseries[] }) {
  return (
    <LineChart data={data}>
      <Line dataKey="ai_tokens" stroke="#8884d8" />
      <Line dataKey="chat_messages" stroke="#82ca9d" />
    </LineChart>
  );
}

// Organization table
export function OrganizationTable({ orgs }: { orgs: Organization[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Users</TableHead>
          <TableHead>Usage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orgs.map(org => (
          <TableRow key={org.id}>
            <TableCell>{org.name}</TableCell>
            <TableCell>{org.plan}</TableCell>
            <TableCell>{org.memberCount}</TableCell>
            <TableCell>{org.monthlyTokens}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Rules

1. **Admin role only** — no team_owner or team_member access
2. **Audit all admin actions** — log to usage_events with `admin_action` type
3. **No destructive operations** — admins can suspend, not delete
4. **Rate limit admin endpoints** — prevent abuse
5. **Paginate all lists** — never return unbounded data
