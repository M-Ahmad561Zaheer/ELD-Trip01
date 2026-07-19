import type { DailyLog } from "./types";

interface ELDLogProps {
  log: DailyLog;
}

const rows = [
  {
    key: "off_duty",
    label: "Off Duty",
  },
  {
    key: "sleeper_berth",
    label: "Sleeper Berth",
  },
  {
    key: "driving",
    label: "Driving",
  },
  {
    key: "on_duty_not_driving",
    label: "On Duty",
  },
];

export default function ELDLog({
  log,
}: ELDLogProps) {
  const width = 960;
  const labelWidth = 120;
  const chartWidth = width - labelWidth;
  const rowHeight = 45;
  const headerHeight = 35;
  const height =
    headerHeight + rows.length * rowHeight + 20;

  const hourToX = (hour: number) =>
    labelWidth + (hour / 24) * chartWidth;

  return (
    <article className="eld-card">
      <div className="eld-heading">
        <div>
          <h3>Driver's Daily Log</h3>
          <p>Day {log.day_number}</p>
        </div>

        <div className="eld-totals">
          <span>
            Driving: {log.totals.driving ?? 0}h
          </span>
          <span>
            On Duty:{" "}
            {log.totals.on_duty_not_driving ?? 0}h
          </span>
          <span>
            Off Duty: {log.totals.off_duty ?? 0}h
          </span>
        </div>
      </div>

      <div className="eld-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="eld-svg"
        >
          {Array.from({ length: 25 }).map(
            (_, hour) => {
              const x = hourToX(hour);

              return (
                <g key={hour}>
                  <line
                    x1={x}
                    x2={x}
                    y1={headerHeight}
                    y2={height - 20}
                    className="grid-line"
                  />
                  {hour < 24 && (
                    <text
                      x={x + 3}
                      y={20}
                      className="hour-label"
                    >
                      {hour}
                    </text>
                  )}
                </g>
              );
            },
          )}

          {rows.map((row, rowIndex) => {
            const y =
              headerHeight +
              rowIndex * rowHeight;

            return (
              <g key={row.key}>
                <text
                  x={5}
                  y={y + rowHeight / 2 + 5}
                  className="status-label"
                >
                  {row.label}
                </text>

                <line
                  x1={labelWidth}
                  x2={width}
                  y1={y + rowHeight / 2}
                  y2={y + rowHeight / 2}
                  className="status-line"
                />

                {log.segments
                  .filter(
                    (segment) =>
                      segment.duty_status === row.key,
                  )
                  .map((segment, index) => (
                    <line
                      key={`${segment.sequence}-${index}`}
                      x1={hourToX(
                        segment.start_hour,
                      )}
                      x2={hourToX(segment.end_hour)}
                      y1={y + rowHeight / 2}
                      y2={y + rowHeight / 2}
                      className="active-line"
                    />
                  ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="remarks">
        <h4>Remarks</h4>

        {log.remarks.length === 0 ? (
          <p>No duty activity recorded.</p>
        ) : (
          log.remarks.map((remark, index) => (
            <p key={`${remark.time}-${index}`}>
              <strong>{remark.time}</strong> —{" "}
              {remark.description} at mile{" "}
              {remark.mile_marker}
            </p>
          ))
        )}
      </div>
    </article>
  );
}