# Smartwatch E-Commerce System - AI Coding Agent Guide

## Architecture Overview

**Monorepo MERN Stack** with three main directories:
- `client/` - React + TypeScript + Vite frontend
- `server/` - Node.js + Express + MongoDB backend
- `common/` - **Shared TypeScript types and configs** used by both client and server for network boundary type safety

**Critical**: Always import types from `common/types.common.ts` and configs from `common/configs.common.ts` when working across client/server to maintain type safety.

## Development Workflow

**Start both servers** (from root):
```bash
npm run dev  # Starts server + Stripe webhook listener
```

**Start client** (from `client/` directory):
```bash
npm run dev  # Runs on http://localhost:5173
```

**Admin access**: `http://localhost:5173/admin` with credentials in `server/configs/configs.ts`

**Database seeding**: Uncomment `await seedAllCollections()` in `server/index.ts` for first-time setup, then comment back. Same for `await mockAllData()` for test data.

**Environment setup**: Requires `.env` files in root and `client/` directories, plus `server/serviceAccountKey.json` for Firebase Admin SDK.

## State Management - Zustand Pattern

All stores follow this pattern in `client/src/store/`:
```typescript
import { create } from "zustand";

const useStore = create<StoreState>((set, get) => ({
  // State
  data: null,

  // Actions return promises, throw formatted errors
  async fetchData(): Promise<DataType> {
    try {
      const res = await retrieve(`${URL}?${queryString}`);
      if (!res.success) throw new Error(res.message);
      return res.data as DataType;
    } catch (error) {
      throw new Error(formatError(error));
    }
  }
}));
```

**Refresh pattern**: Use `useRefreshStore` to trigger data refetches across components:
```typescript
const { refresh } = useRefreshStore();
refresh("admin");  // Triggers useEffect(, [refreshSignal]) in other components
```

## Permission-Based Access Control

**Always check permissions** before rendering admin features:
```typescript
import useHasPermission from "../../../hooks/admin/useHasPermission";

const [canCreate, canEdit, canDelete] = [
  useHasPermission("c_product"),
  useHasPermission("u_product"),
  useHasPermission("d_product"),
];

// Use in JSX
{canEdit && <button>Edit</button>}
```

Permission codes follow pattern: `{operation}_{resource}` where operation is `c` (create), `r` (read), `u` (update), `d` (delete).

## Form Handling - FormInput Pattern

Forms use structured validation with `FormInput<ValT, ErrT>`:
```typescript
type FormInput<ValT = string, ErrT = string> = {
  val: ValT;
  err?: ErrT;
};

// For file uploads
type FormFileInput = FormInput<File | string | null, string | string[]>;
// File = uploading, string = existing URL, null = remove

// Usage in components
const [formData, setFormData] = useState({
  name: { val: "", err: undefined } as FormInput,
  image: { val: null, err: undefined } as FormFileInput,
});

// Validation
if (!formData.name.val) {
  setFormData(prev => ({ ...prev, name: { ...prev.name, err: "Required" } }));
}
```

## Backend Middleware Chain Pattern

Routes in `server/routes/` follow strict middleware order:
```typescript
router.post("/",
  verifyPermission("c_product"),        // 1. Check permission
  verifyEmptyBody,                      // 2. Validate body exists
  inputSanitizer("product"),            // 3. Sanitize inputs
  verifyProductInput("create"),         // 4. Validate specific fields
  create                                // 5. Controller
);
```

**Auth middlewares** (`server/utils/middlewares/auth.middleware.ts`):
- `verifyAuthentication` - User must be logged in
- `verifyPermission(code)` - User must have specific permission
- `verifyJwtHasUserId` - JWT must contain userId

## Management Page Component Pattern

Admin management pages (`client/src/components/admin/*/`) follow consistent structure:

```typescript
// State structure
type Process = { isProcessing: boolean; isFetching: boolean; isExportingList: boolean; };
type SearchForm = Omit<SearchQuery, "limit" | "offset"> & { limit: string; offset: string; };
type Modal = { configDisplay: boolean; /* operation-specific modals */ };

// UI Layout
<div className="card shadow-sm">
  <div className="card-header bg-white p-3">
    {/* Filters using input-group format with compact labels */}
    <div className="input-group">
      <label htmlFor="field" className="input-group-text">Label</label>
      <input/select className="form-control/form-select" />
    </div>

    {/* Date ranges use inline format */}
    <div className="input-group">
      <label className="input-group-text">Date Range</label>
      <input type="date" />
      <span className="input-group-text">-</span>
      <input type="date" />
    </div>

    {/* Action buttons aligned right */}
    <div className="col-12 col-lg-auto ms-lg-auto d-flex justify-content-end gap-2">
      <button className="btn btn-primary">Apply filters</button>
      <button className="btn btn-secondary">Clear all filters</button>
    </div>
  </div>

  <div className="card-body p-0">
    <div className="table-responsive">{/* Table */}</div>
    <div className="card-footer">{/* Pagination */}</div>
  </div>
</div>
```

**See**: `ModelManagement.tsx` and `OrderManagement.tsx` as reference implementations.

## API Communication

Use utility functions from `client/src/utils/utils.ts`:
```typescript
import { retrieve, create, patch, remove } from "./utils/utils";

// Automatic token refresh on 401
const res = await retrieve(`${URL}?${queryString}`);
if (!res.success) throw new Error(res.message);
return res.data as TypedResponse;
```

**All responses** follow `Response` type from `common/types.common.ts`:
```typescript
type SuccessResponse<T> = { success: true; message?: string; data?: T; };
type ErrorResponse = { success: false; message: string; };
```

## Type Safety Conventions

**Displayable Fields**: Types ending in `DisplayableField` define configurable table columns:
```typescript
type AdminProductDisplayableField = keyof Omit<AdminProductResponse, "imageUrls"> | "actions";
```

**Search Queries**: Follow pattern `{Resource}SearchQuery` with optional filters and pagination.

**Form Data**: Types ending in `FormData` use `FormInput` pattern for validation state.

## Firebase Integration

Storage buckets configured in `client/src/utils/firebase.config.ts`:
- `userAvatarStorage` - User avatars
- `productImgStorage` - Product images
- `productLogoStorage` - Brand/OS logos
- `returnImgStorage` - Return request images

**Upload pattern**: Use `uploadImage()` utility in `client/src/utils/utils.ts` which handles validation and upload.

## Stripe Integration

**Webhooks**: `server/routes/webhook.route.ts` uses raw body parsing. Run `stripe listen` (included in `npm run dev`).

**Payment flows**: Controllers in `server/controllers/stripe.controller.ts` handle checkout sessions, webhooks, and refunds.

## Database Models & Controllers

**Controllers** (`server/controllers/`) export async functions:
```typescript
export async function create(req: Request, res: Response): Promise<void> {
  // Business logic
  res.status(201).json({ success: true, data: result });
}
```

**Models** (`server/models/`) use Mongoose with TypeScript interfaces:
```typescript
interface IModel extends Document {
  field: string;
}
const Model = mongoose.model<IModel>("Model", schema);
```

## Naming Conventions

- Components: PascalCase (`OrderManagement.tsx`)
- Stores: camelCase with `use` prefix (`useOrderStore.ts`)
- Types: PascalCase (`AdminOrderResponse`)
- Constants: SCREAMING_SNAKE_CASE (`ORDER_FIELD_LABEL_LEGEND`)
- Routes: kebab-case files (`product.route.ts`)
- Controllers: camelCase functions (`adminSearch`)

## Common Pitfalls

❌ Don't import types directly from client or server in shared code - use `common/`
❌ Don't forget permission checks on admin components and routes
❌ Don't mutate FormInput state directly - spread prev state
❌ Don't use generic date values - use `getLocalDateString()` for consistency
❌ Don't skip middleware chain order - causes validation issues

## Testing & Mock Data

Mock utilities in `server/utils/mock.ts` use `@faker-js/faker`. Seeding in `server/utils/seedings.ts` creates required reference data (states, roles, permissions).

**Key files**: `server/configs/configs.ts` for system users, `common/configs.common.ts` for shared constants.
