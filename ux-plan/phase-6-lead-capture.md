# Phase 6 — Lead Capture & Conversion

> **Effort:** 3–5 days | **Files touched:** `SearchPage.tsx`, `LeadPopup.tsx`, `useLeadPopup.ts`, `server/src/routes/`, `server/prisma/schema.prisma`, new migration  
> **Goal:** Convert more passive browsers into leads. Every user who leaves without inquiring is a missed sale. This phase adds multiple touchpoints that capture contact info at the right moment.

---

## Step 1 — Exit-intent popup (improve existing `LeadPopup`)

**Why:** A user about to close the tab is lost. An exit-intent popup offers one last chance to capture them. The existing `LeadPopup` component already exists — this step wires in the exit trigger.

**Where:** `client/src/hooks/useLeadPopup.ts` (add trigger logic). `client/src/components/LeadPopup.tsx` (add personalized message).

**What to do:**

1. Open `useLeadPopup.ts` and read the current trigger logic. It likely uses a timer or scroll threshold. Add an exit-intent trigger:
   ```ts
   useEffect(() => {
     // Don't trigger on mobile (no mouseleave)
     if (window.innerWidth < 769) return;

     const STORAGE_KEY = "skytravel:exit-popup-shown";
     if (sessionStorage.getItem(STORAGE_KEY)) return;

     function handleMouseLeave(e: MouseEvent) {
       // Only trigger if mouse leaves from the top of viewport
       if (e.clientY < 10) {
         setOpen(true);
         sessionStorage.setItem(STORAGE_KEY, "1");
         document.removeEventListener("mouseleave", handleMouseLeave);
       }
     }

     // Wait 30 seconds before enabling exit intent (user must show engagement)
     const timer = setTimeout(() => {
       document.addEventListener("mouseleave", handleMouseLeave);
     }, 30_000);

     return () => {
       clearTimeout(timer);
       document.removeEventListener("mouseleave", handleMouseLeave);
     };
   }, []);
   ```

2. Pass the current search context into `LeadPopup` so the message is personalized:
   ```tsx
   <LeadPopup
     isOpen={leadPopupOpen}
     onClose={() => setLeadPopupOpen(false)}
     prefilledQuery={activeQuery}
     prefilledDateStart={activeDateStart}
   />
   ```

3. Update `LeadPopup.tsx` to accept optional pre-filled values and show a context-aware message:
   ```tsx
   interface LeadPopupProps {
     isOpen: boolean;
     onClose: () => void;
     prefilledQuery?: string;
     prefilledDateStart?: string;
   }

   // In the popup header:
   <h2>
     {prefilledQuery
       ? `Nenašli jste vhodný zájezd do ${prefilledQuery}?`
       : "Nenašli jste co hledáte?"}
   </h2>
   <p>Zanechte nám kontakt — zavoláme vám a nabídneme nejlepší možnosti.</p>
   ```

4. Add subject prefix in the email sent from the backend to make it clear the inquiry came from an exit popup:
   ```tsx
   // In form submit handler in LeadPopup:
   body: JSON.stringify({
     ...formData,
     source: "exit-popup",
     searchContext: prefilledQuery ?? "",
   })
   ```

---

## Step 2 — "Upozornit na slevu" price alert button per tour

**Why:** A user likes a tour but finds it too expensive. Instead of losing them, offer to notify when the price drops. This also builds your email list for retargeting.

**Where:**
- Frontend: `SearchPage.tsx` — inside `PublicTourCard` (add "🔔 Upozornit" button). New `PriceAlertModal.tsx` component.
- Backend: New `GET /api/alerts` (unused), `POST /api/alerts` route. New `PriceAlert` Prisma model.

### Backend changes

1. Add to `server/prisma/schema.prisma`:
   ```prisma
   model PriceAlert {
     id           Int      @id @default(autoincrement())
     email        String
     providerId   String
     externalId   String
     tourTitle    String
     priceMax     Float
     createdAt    DateTime @default(now())
     triggered    Boolean  @default(false)
     triggeredAt  DateTime?

     @@index([providerId, externalId])
     @@index([email])
   }
   ```

2. Run a new migration:
   ```bash
   cd /home/ubuntu/skytravel/server
   npx prisma migrate dev --name migration_09_price_alerts
   ```
   Include this in deploy script if running migrations automatically, or run manually post-deploy.

3. Create `server/src/routes/alerts.ts`:
   ```ts
   import { Router } from "express";
   import { prisma } from "../prisma";
   import asyncHandler from "../middleware/asyncHandler";

   const router = Router();

   router.post(
     "/",
     asyncHandler(async (req, res) => {
       const { email, providerId, externalId, tourTitle, priceMax } = req.body as {
         email?: string;
         providerId?: string;
         externalId?: string;
         tourTitle?: string;
         priceMax?: number;
       };

       if (!email || !providerId || !externalId || !priceMax) {
         return res.status(400).json({ error: "Missing required fields" });
       }

       // Basic email format check
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
         return res.status(400).json({ error: "Invalid email" });
       }

       // Prevent duplicate alerts for same email + tour
       const existing = await prisma.priceAlert.findFirst({
         where: { email, providerId, externalId, triggered: false },
       });
       if (existing) {
         return res.json({ ok: true, message: "Alert already registered" });
       }

       await prisma.priceAlert.create({
         data: { email, providerId, externalId, tourTitle: tourTitle ?? "", priceMax },
       });

       return res.json({ ok: true });
     })
   );

   export default router;
   ```

4. Register the route in `server/src/index.ts`:
   ```ts
   import alertsRouter from "./routes/alerts";
   // ...
   app.use("/api/alerts", alertsRouter);
   ```

### Frontend changes

5. Create `client/src/components/PriceAlertModal.tsx`:
   ```tsx
   import { useState } from "react";

   interface Props {
     tour: { externalId: string; source: string; title: string; price: number };
     onClose: () => void;
   }

   export function PriceAlertModal({ tour, onClose }: Props) {
     const [email, setEmail] = useState("");
     const [priceMax, setPriceMax] = useState(Math.ceil(tour.price * 0.9));
     const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

     async function submit(e: React.FormEvent) {
       e.preventDefault();
       setStatus("loading");
       try {
         const res = await fetch("/api/alerts", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             email,
             providerId: tour.source,
             externalId: tour.externalId,
             tourTitle: tour.title,
             priceMax,
           }),
         });
         if (!res.ok) throw new Error();
         setStatus("done");
       } catch {
         setStatus("error");
       }
     }

     return (
       <div className="modal-overlay" onClick={onClose}>
         <div className="modal-box" onClick={(e) => e.stopPropagation()}>
           <button className="modal-close" onClick={onClose}>✕</button>
           <h2>🔔 Upozornit na slevu</h2>
           <p className="modal-subtitle">{tour.title}</p>
           {status === "done" ? (
             <p className="alert-success">
               ✓ Zaregistrováno! Pošleme vám email, jakmile cena klesne.
             </p>
           ) : (
             <form onSubmit={submit}>
               <label>
                 Váš email
                 <input
                   type="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   placeholder="vas@email.cz"
                 />
               </label>
               <label>
                 Upozornit při ceně pod (Kč)
                 <input
                   type="number"
                   min={1}
                   value={priceMax}
                   onChange={(e) => setPriceMax(Number(e.target.value))}
                   required
                 />
               </label>
               {status === "error" && <p className="alert-error">Chyba. Zkuste to prosím znovu.</p>}
               <button type="submit" disabled={status === "loading"} className="btn-primary">
                 {status === "loading" ? "Ukládám…" : "Zaregistrovat upozornění"}
               </button>
             </form>
           )}
         </div>
       </div>
     );
   }
   ```

6. Add a "🔔 Upozornit" button at the bottom of each tour card:
   ```tsx
   // State in SearchPage:
   const [alertTour, setAlertTour] = useState<UnifiedTour | null>(null);

   // In PublicTourCard footer:
   <button
     type="button"
     className="card-alert-btn"
     onClick={() => setAlertTour(tour)}
   >
     🔔 Upozornit na slevu
   </button>

   // Render modal at the page level:
   {alertTour && (
     <PriceAlertModal
       tour={alertTour}
       onClose={() => setAlertTour(null)}
     />
   )}
   ```

7. Add to `site.css`:
   ```css
   .card-alert-btn {
     background: none;
     border: 1px solid #e2e8f0;
     border-radius: 6px;
     padding: 4px 10px;
     font-size: 0.78rem;
     color: #718096;
     cursor: pointer;
     transition: border-color .15s, color .15s;
     margin-top: 4px;
   }
   .card-alert-btn:hover { border-color: var(--blue); color: var(--blue); }

   .alert-success { color: #276749; background: #f0fff4; border-radius: 8px; padding: 12px; }
   .alert-error   { color: #9b2c2c; background: #fff5f5; border-radius: 8px; padding: 10px; font-size: 0.85rem; }
   ```

---

## Step 3 — Tour comparison tray

**Why:** Users browsing multiple tours can't remember which one had the better board or fewer nights. A compare tray lets them make a confident decision without tab-switching.

**Where:** `SearchPage.tsx` — compare state, card checkbox, compare tray at bottom. New `CompareTray.tsx` component.

**What to do:**

1. Add compare state in `SearchPage.tsx`:
   ```tsx
   const [compareIds, setCompareIds] = useState<string[]>([]);

   function toggleCompare(id: string) {
     setCompareIds(prev => {
       if (prev.includes(id)) return prev.filter(x => x !== id);
       if (prev.length >= 3) return prev; // max 3
       return [...prev, id];
     });
   }
   ```

2. Add compare checkbox to `PublicTourCard`:
   ```tsx
   const compareId = `${tour.source}-${tour.externalId}`;
   const isComparing = compareIds.includes(compareId);

   <label className="card-compare">
     <input
       type="checkbox"
       checked={isComparing}
       onChange={() => toggleCompare(compareId)}
       disabled={!isComparing && compareIds.length >= 3}
     />
     Porovnat
   </label>
   ```

3. Create `client/src/components/CompareTray.tsx`:
   ```tsx
   interface Props {
     tours: UnifiedTour[];
     onRemove: (id: string) => void;
     onClear: () => void;
   }

   export function CompareTray({ tours, onRemove, onClear }: Props) {
     const [expanded, setExpanded] = useState(false);

     if (tours.length === 0) return null;

     return (
       <div className="compare-tray">
         <div className="compare-tray__bar">
           <span>{tours.length} zájezdy k porovnání</span>
           <button type="button" onClick={() => setExpanded(v => !v)}>
             {expanded ? "Skrýt ▼" : "Porovnat ▲"}
           </button>
           <button type="button" className="compare-tray__clear" onClick={onClear}>Vymazat</button>
         </div>

         {expanded && (
           <div className="compare-table-wrap">
             <table className="compare-table">
               <thead>
                 <tr>
                   <th>Vlastnost</th>
                   {tours.map(t => (
                     <th key={t.externalId}>
                       {t.title}
                       <button onClick={() => onRemove(`${t.source}-${t.externalId}`)}>✕</button>
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {[
                   ["Cena", (t: UnifiedTour) => `${t.price.toLocaleString("cs-CZ")} Kč`],
                   ["Destinace", (t: UnifiedTour) => t.destination],
                   ["Odlet", (t: UnifiedTour) => fmtDate(t.startDate)],
                   ["Nocí", (t: UnifiedTour) => String(nightsOf(t))],
                   ["Strava", (t: UnifiedTour) => boardLabel[t.board] ?? t.board],
                   ["Hvězdy", (t: UnifiedTour) => starsDisplay(t.stars)],
                   ["Doprava", (t: UnifiedTour) => transportLabel[t.transport] ?? t.transport],
                 ] as [string, (t: UnifiedTour) => string][]).map(([label, val]) => (
                   <tr key={label}>
                     <td>{label}</td>
                     {tours.map(t => <td key={t.externalId}>{val(t)}</td>)}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>
     );
   }
   ```
   Note: `fmtDate`, `boardLabel`, `transportLabel`, `starsDisplay`, `nightsOf` should be imported from `SearchPage.tsx` helpers or moved to a shared `utils/tourFormatters.ts` file.

4. Add to `site.css`:
   ```css
   .compare-tray {
     position: fixed;
     bottom: 0; left: 0; right: 0;
     z-index: 150;
     background: #fff;
     border-top: 2px solid var(--blue);
     box-shadow: 0 -4px 20px rgba(0,0,0,.12);
   }
   .compare-tray__bar {
     display: flex;
     align-items: center;
     gap: 16px;
     padding: 12px 24px;
   }
   .compare-tray__bar span { flex: 1; font-weight: 600; }
   .compare-tray__bar button {
     background: var(--blue); color: #fff;
     border: none; border-radius: 6px;
     padding: 6px 16px; cursor: pointer;
   }
   .compare-tray__clear {
     background: #e2e8f0 !important; color: #4a5568 !important;
   }

   .compare-table-wrap { overflow-x: auto; padding: 0 24px 16px; }
   .compare-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
   .compare-table th, .compare-table td {
     padding: 8px 12px;
     border: 1px solid #e2e8f0;
     text-align: left;
   }
   .compare-table thead th { background: #ebf8ff; font-weight: 700; }
   .compare-table tbody tr:nth-child(even) td { background: #f7fafc; }

   .card-compare {
     display: flex; align-items: center; gap: 5px;
     font-size: 0.78rem; color: #718096; cursor: pointer;
     margin-top: 4px;
   }
   .card-compare input { cursor: pointer; }
   ```

5. Render `CompareTray` at the page level:
   ```tsx
   const compareTours = useMemo(
     () => displayedTours.filter(t => compareIds.includes(`${t.source}-${t.externalId}`)),
     [displayedTours, compareIds]
   );

   // At bottom of JSX:
   <CompareTray
     tours={compareTours}
     onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))}
     onClear={() => setCompareIds([])}
   />
   ```

---

## Verification Checklist

- [ ] Exit popup does NOT fire on mobile (viewport < 769px)
- [ ] Exit popup only fires if user has been on page ≥ 30 seconds
- [ ] Exit popup only fires once per session (sessionStorage flag)
- [ ] Popup message personalizes with the active search query
- [ ] Price alert modal validates email format client-side and server-side
- [ ] Duplicate alerts for the same email + tour are rejected gracefully
- [ ] `POST /api/alerts` stores a row in `PriceAlert` table (verify in Prisma Studio)
- [ ] Alert success message shows after submission
- [ ] Compare checkbox is disabled when 3 tours already selected
- [ ] Compare tray appears at bottom with correct tour count
- [ ] Comparison table renders all 7 rows with correct data
- [ ] Removing a tour from tray works; clearing removes all
- [ ] Compare tray does not overlap mobile filter FAB (z-index ordering)
- [ ] `npx prisma migrate status` shows migration applied on production
- [ ] `npx tsc --noEmit` passes in both `/client` and `/server`
