import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchAdminTours } from "../api";
import { type OwnTour } from "../data";
import "../admin.css";

export default function AdminStatisticsPage() {
  const [tours, setTours] = useState<OwnTour[]>([]);

  useEffect(() => {
    fetchAdminTours().then((items) => setTours(items)).catch(() => setTours([]));
  }, []);

  const ordered = useMemo(() => [...tours].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [tours]);

  return (
    <AdminLayout title="Statistiky & výkon">
      <section className="admin-card stats-card">
        <div className="stats-header">
          <div>
            <h2>Statistiky</h2>
            <p className="note">Google Analytics + ruční metriky k poptávkám a e-mailům.</p>
          </div>
          <div className="stats-period">
            <button type="button" className="chip is-active">30 dní</button>
            <button type="button" className="chip">90 dní</button>
            <button type="button" className="chip">Rok</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-tile">
            <span>Návštěvy webu</span>
            <strong>48 920</strong>
            <em className="up">+12.4%</em>
          </div>
          <div className="stat-tile">
            <span>Poptávky odeslané</span>
            <strong>1 284</strong>
            <em className="up">+7.1%</em>
          </div>
          <div className="stat-tile">
            <span>Konverzní poměr</span>
            <strong>2.62%</strong>
            <em className="up">+0.4%</em>
          </div>
          <div className="stat-tile">
            <span>Nejžádanější destinace</span>
            <strong>{ordered[0]?.destination || "—"}</strong>
            <em className="down">-1 pozice</em>
          </div>
        </div>

        <div className="stats-charts">
          <div className="chart-card">
            <div className="chart-head">
              <h3>Trendy návštěv</h3>
            </div>
            <svg className="chart" viewBox="0 0 360 150" role="img" aria-label="Trendy návštěv">
              <g className="chart-axis">
                <line x1="30" y1="16" x2="30" y2="122" />
                <line x1="30" y1="122" x2="352" y2="122" />
                <text x="8" y="18">100</text>
                <text x="12" y="72">50</text>
                <text x="16" y="122">0</text>
                <text x="30" y="142">Po</text>
                <text x="82" y="142">Út</text>
                <text x="134" y="142">St</text>
                <text x="186" y="142">Čt</text>
                <text x="238" y="142">Pá</text>
                <text x="290" y="142">So</text>
                <text x="332" y="142">Ne</text>
              </g>
              <polyline
                points="30,110 82,90 134,95 186,70 238,78 290,50 332,60"
                fill="none"
                stroke="#2b67d1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="30,120 82,105 134,112 186,88 238,92 290,70 332,75"
                fill="none"
                stroke="#f3d43b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="chart-legend">
              <span><i className="dot blue" />Návštěvy</span>
              <span><i className="dot yellow" />Poptávky</span>
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-head">
              <h3>Kanály</h3>
            </div>
            <div className="bar-list">
              <div className="bar-list__row"><span>Organické vyhledávání</span><strong>42%</strong></div>
              <div className="bar"><span style={{ width: "42%" }} /></div>
              <div className="bar-list__row"><span>Přímý přístup</span><strong>26%</strong></div>
              <div className="bar"><span style={{ width: "26%" }} /></div>
              <div className="bar-list__row"><span>Sociální sítě</span><strong>18%</strong></div>
              <div className="bar"><span style={{ width: "18%" }} /></div>
              <div className="bar-list__row"><span>Placené kampaně</span><strong>14%</strong></div>
              <div className="bar"><span style={{ width: "14%" }} /></div>
            </div>
          </div>
        </div>

        <div className="stats-table">
          <div className="table-header">
            <span>Destinace</span>
            <span>Prohlédnutí</span>
            <span>Poptávky</span>
            <span>E-maily</span>
          </div>
          {ordered.map((tour) => (
            <div key={`stats-${tour.id}`} className="table-row">
              <div className="table-cell table-offer">
                <img src={tour.image} alt={tour.destination} />
                <div>
                  <h3>{tour.destination}</h3>
                  <p>{tour.title}</p>
                </div>
              </div>
              <div className="table-cell">
                <strong>{Math.floor(1200 + (tour.id ?? 1) * 83)}</strong>
              </div>
              <div className="table-cell">
                <strong>{Math.floor(60 + (tour.id ?? 1) * 6)}</strong>
              </div>
              <div className="table-cell">
                <strong>{Math.floor(30 + (tour.id ?? 1) * 4)}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
