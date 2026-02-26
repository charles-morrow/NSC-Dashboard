import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Panel, KeyValueList } from '../Shared';
import { fmtInt, fmtMoney, fmtNum, fmtPctValue } from '../utils';

function SegmentationMixSection({
  compAttendanceChart,
  compEfficiencyChart,
  chartBaseOptions,
  segments,
  ticketMixChart,
  merchMixChart,
  ticketMix,
  kpis,
}) {
  return (
    <div className="two-col-layout">
      <Panel
        title="Segmentation and Commercial Analytics"
        subtitle="Separate demand volume from revenue efficiency to avoid mixed-unit interpretation errors."
      >
        <div className="chart-box"><Bar data={compAttendanceChart} options={chartBaseOptions} /></div>
        <div className="chart-box"><Bar data={compEfficiencyChart} options={chartBaseOptions} /></div>
        <div className="two-mini-tables">
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Weekday</th>
                  <th>Games</th>
                  <th>Avg Att</th>
                  <th>Rev/Att</th>
                </tr>
              </thead>
              <tbody>
                {(segments.by_weekday || []).map((row) => (
                  <tr key={row.segment}>
                    <td>{row.segment}</td>
                    <td>{row.games}</td>
                    <td>{fmtInt(row.avg_attendance)}</td>
                    <td>{fmtMoney(row.avg_revenue_per_attendee, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Games</th>
                  <th>Avg Att</th>
                  <th>Rev/Att</th>
                </tr>
              </thead>
              <tbody>
                {(segments.by_month || []).map((row) => (
                  <tr key={row.segment}>
                    <td>{row.segment}</td>
                    <td>{row.games}</td>
                    <td>{fmtInt(row.avg_attendance)}</td>
                    <td>{fmtMoney(row.avg_revenue_per_attendee, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel
        title="Ticket and Merchandise Mix"
        subtitle="Revenue mechanics decompose into pricing/mix decisions and fan attachment behavior."
      >
        <div className="chart-box"><Doughnut data={ticketMixChart} options={chartBaseOptions} /></div>
        <div className="chart-box"><Bar data={merchMixChart} options={chartBaseOptions} /></div>
        <div className="split-mini-grid">
          <div className="info-card">
            <h3>Ticket Mix Snapshot</h3>
            <ul className="clean-list">
              {ticketMix.slice(0, 4).map((t) => (
                <li key={t.ticket_type}>
                  <strong>{t.ticket_type}:</strong> {fmtInt(t.quantity)} units, {fmtMoney(t.revenue)} revenue, {fmtPctValue(t.share_of_units, 2)} share
                </li>
              ))}
            </ul>
          </div>
          <div className="info-card alt">
            <h3>Merch Efficiency</h3>
            <KeyValueList
              items={[
                { label: 'Merch Revenue / Attendee', value: fmtMoney(kpis.merch_revenue_per_attendee, 2) },
                { label: 'Ticket Revenue / Attendee', value: fmtMoney(kpis.ticket_revenue_per_attendee, 2) },
                { label: 'Merch Units / 1K', value: fmtNum(kpis.merch_units_per_1000_attendees, 2) },
                { label: 'Total Revenue / Attendee', value: fmtMoney(kpis.revenue_per_attendee, 2) },
              ]}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default SegmentationMixSection;
