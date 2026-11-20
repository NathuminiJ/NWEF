-- Add the Trinity house selection captured in the applicant forms.
ALTER TABLE "Child" ADD COLUMN "house" TEXT NOT NULL DEFAULT 'Not applicable';
