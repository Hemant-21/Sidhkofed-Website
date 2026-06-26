<<<<<<< HEAD
/**
 * Users feature (Administration). Admin account management — list, create, edit, status toggle, and
 * password reset — built on the shared CRUD/form infrastructure and the `/admin/users` backend API.
 */
export { UserListPage } from './user-list-page';
export { UserFormPage } from './user-form-page';
export { USERS_RESOURCE, USER_PERMS } from './api';
export * from './types';
=======
export { UserListPage } from './user-list-page';
export { UserDetailPage } from './user-detail-page';
export { UserFormPage } from './user-form-page';
export type {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  RoleRef,
} from './types';
export { useUserList, useUserDetail, useCreateUser, useUpdateUser } from './hooks';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
