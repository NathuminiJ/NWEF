import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS, can } from '@/lib/rbac';

describe('RBAC matrix', () => {
  it('keeps applicants out of staff capabilities', () => {
    expect(can('APPLICANT', PERMISSIONS.APPLICATION_CREATE)).toBe(true);
    expect(can('APPLICANT', PERMISSIONS.SCREENING_REVIEW)).toBe(false);
    expect(can('APPLICANT', PERMISSIONS.TRUSTEE_DECIDE)).toBe(false);
    expect(can('APPLICANT', PERMISSIONS.FINANCE_MANAGE)).toBe(false);
    expect(can('APPLICANT', PERMISSIONS.AUDIT_READ)).toBe(false);
  });

  it('separates screening, panel, trustee and finance duties', () => {
    expect(can('SCREENING_REVIEWER', PERMISSIONS.SCORE_SUBMIT)).toBe(false);
    expect(can('INTERVIEW_PANEL', PERMISSIONS.TRUSTEE_DECIDE)).toBe(false);
    expect(can('TRUSTEE', PERMISSIONS.FINANCE_MANAGE)).toBe(false);
    expect(can('FINANCE_OFFICER', PERMISSIONS.TRUSTEE_DECIDE)).toBe(false);
  });

  it('grants every permission to super admin', () => {
    const all = Object.values(PERMISSIONS);
    expect(all.every((permission) => can('SUPER_ADMIN', permission))).toBe(true);
    expect(ROLE_PERMISSIONS.SUPER_ADMIN.size).toBe(all.length);
  });
});
