# RestroRX backlog

| Priority | Work | Acceptance criteria |
| --- | --- | --- |
| P0 | Review and close the production lead-access exposure | Confirm the Vercel and Supabase projects through their owners. Verify effective anonymous grants/policies without fetching customer records. Confirm a backup and the secure cutover sequence. Legacy dashboard URL reaches the protected route. Unauthenticated users cannot read or change lead data. |
| P0 | Verify enquiry and authorised retrieval against the existing stack | In an authorised test environment, diagnose without writing a lead, submit one synthetic enquiry, retry without a duplicate, retrieve it through the protected dashboard, export it and verify the CX update. Check failure states and legacy records. |
| P1 | Validate diagnostic usefulness with restaurant owners | Compare the first actions against real operator cases, explain screening limits, reduce questions with low decision value and confirm which format-specific rules Chef Amey approves. |
| P1 | Confirm privacy copy and contact handling | Review actual fields, data use and retention. Keep enquiry consent distinct from any future marketing consent. Validate the wording against the approved production workflow. |
| P2 | Instrument the customer journey | Capture starts, completions, consultation clicks and confirmed enquiries once per action. Preserve relevant campaign attribution, exclude PII and reconcile test events against stored synthetic enquiries. |
| P3 | Improve conversion and content from measured results | Establish funnel baseline. Draft restaurant-owner education around menu profitability, costing, waste, consistency and staffing. Tie each piece to a relevant destination and trackable link. Verify authorisation and publication separately. |
| Later | Expand lead operations if volume warrants it | Determine if records beyond the latest 200 need dashboard pagination or broader exports. Evaluate lead notifications and distributed abuse protection using observed traffic and operating needs. |
