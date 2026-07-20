import { useMemo } from "react";

import type { DailyLog } from "./types";

interface ELDLogProps {
  log: DailyLog;
}

const rows = [
  {
    key: "off_duty",
    label: "Off Duty",
    shortLabel: "OFF",
  },
  {
    key: "sleeper_berth",
    label: "Sleeper Berth",
    shortLabel: "SB",
  },
  {
    key: "driving",
    label: "Driving",
    shortLabel: "D",
  },
  {
    key: "on_duty_not_driving",
    label: "On Duty (Not Driving)",
    shortLabel: "ON",
  },
] as const;

type DutyStatus = (typeof rows)[number]["key"];

const clampHour = (hour: number) =>
  Math.min(24, Math.max(0, hour));

const formatHours = (hours: number | undefined) => {
  const value = Number(hours ?? 0);

  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(1);
};

export default function ELDLog({
  log,
}: ELDLogProps) {
  const width = 1120;
  const labelWidth = 170;
  const totalsWidth = 70;
  const chartWidth =
    width - labelWidth - totalsWidth;

  const headerHeight = 48;
  const rowHeight = 54;
  const chartBottom =
    headerHeight + rows.length * rowHeight;

  const height = chartBottom + 24;

  const hourToX = (hour: number) =>
    labelWidth +
    (clampHour(hour) / 24) * chartWidth;

  const rowCenterY = (status: DutyStatus) => {
    const rowIndex = rows.findIndex(
      (row) => row.key === status,
    );

    return (
      headerHeight +
      rowIndex * rowHeight +
      rowHeight / 2
    );
  };

  const validSegments = useMemo(
    () =>
      [...log.segments]
        .filter((segment) => {
          const validDutyStatus = rows.some(
            (row) =>
              row.key === segment.duty_status,
          );

          return (
            validDutyStatus &&
            Number.isFinite(segment.start_hour) &&
            Number.isFinite(segment.end_hour) &&
            segment.end_hour >
              segment.start_hour
          );
        })
        .sort(
          (first, second) =>
            first.start_hour -
            second.start_hour,
        ),
    [log.segments],
  );

  const connectorLines = useMemo(() => {
    return validSegments
      .slice(0, -1)
      .map((segment, index) => {
        const nextSegment =
          validSegments[index + 1];

        if (
          segment.duty_status ===
          nextSegment.duty_status
        ) {
          return null;
        }

        const transitionHour =
          Math.abs(
            segment.end_hour -
              nextSegment.start_hour,
          ) < 0.01
            ? segment.end_hour
            : nextSegment.start_hour;

        return {
          key: `${segment.sequence}-${nextSegment.sequence}`,
          x: hourToX(transitionHour),
          y1: rowCenterY(
            segment.duty_status as DutyStatus,
          ),
          y2: rowCenterY(
            nextSegment.duty_status as DutyStatus,
          ),
        };
      })
      .filter(
        (
          connector,
        ): connector is {
          key: string;
          x: number;
          y1: number;
          y2: number;
        } => connector !== null,
      );
  }, [validSegments]);

  return (
    <article className="eld-card">
      <div className="eld-heading">
        <div className="eld-title-group">
          <span className="eld-day-badge">
            Day {log.day_number}
          </span>

          <div>
            <h3>Driver&apos;s Daily Log</h3>

            <p>
              24-hour record of duty status
            </p>
          </div>
        </div>

        <div
          className="eld-totals"
          aria-label={`Day ${log.day_number} duty totals`}
        >
          <span className="eld-total-driving">
            <small>Driving</small>
            <strong>
              {formatHours(
                log.totals.driving,
              )}
              h
            </strong>
          </span>

          <span className="eld-total-on-duty">
            <small>On Duty</small>
            <strong>
              {formatHours(
                log.totals
                  .on_duty_not_driving,
              )}
              h
            </strong>
          </span>

          <span className="eld-total-sleeper">
            <small>Sleeper</small>
            <strong>
              {formatHours(
                log.totals.sleeper_berth,
              )}
              h
            </strong>
          </span>

          <span className="eld-total-off-duty">
            <small>Off Duty</small>
            <strong>
              {formatHours(
                log.totals.off_duty,
              )}
              h
            </strong>
          </span>
        </div>
      </div>

      <div
        className="eld-scroll"
        tabIndex={0}
        aria-label={`Scrollable ELD graph for day ${log.day_number}`}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="eld-svg"
          role="img"
          aria-labelledby={`eld-title-${log.day_number}`}
          aria-describedby={`eld-description-${log.day_number}`}
        >
          <title
            id={`eld-title-${log.day_number}`}
          >
            ELD duty-status graph for day{" "}
            {log.day_number}
          </title>

          <desc
            id={`eld-description-${log.day_number}`}
          >
            A 24-hour graph showing off-duty,
            sleeper berth, driving, and on-duty
            not-driving activity.
          </desc>

          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            className="eld-background"
          />

          <rect
            x={labelWidth}
            y={headerHeight}
            width={chartWidth}
            height={rows.length * rowHeight}
            className="eld-chart-background"
          />

          <line
            x1={labelWidth}
            x2={labelWidth}
            y1={0}
            y2={chartBottom}
            className="eld-border-line"
          />

          <line
            x1={labelWidth + chartWidth}
            x2={labelWidth + chartWidth}
            y1={0}
            y2={chartBottom}
            className="eld-border-line"
          />

          {Array.from({
            length: 97,
          }).map((_, quarterIndex) => {
            const hour = quarterIndex / 4;
            const x = hourToX(hour);
            const isFullHour =
              quarterIndex % 4 === 0;
            const isHalfHour =
              quarterIndex % 2 === 0;

            return (
              <line
                key={`quarter-${quarterIndex}`}
                x1={x}
                x2={x}
                y1={headerHeight}
                y2={chartBottom}
                className={
                  isFullHour
                    ? "grid-line grid-line-hour"
                    : isHalfHour
                      ? "grid-line grid-line-half"
                      : "grid-line grid-line-quarter"
                }
              />
            );
          })}

          {Array.from({
            length: 25,
          }).map((_, hour) => {
            const x = hourToX(hour);

            if (hour === 24) {
              return (
                <text
                  key={hour}
                  x={x - 4}
                  y={28}
                  textAnchor="end"
                  className="hour-label"
                >
                  24
                </text>
              );
            }

            return (
              <text
                key={hour}
                x={x + 4}
                y={28}
                className="hour-label"
              >
                {hour}
              </text>
            );
          })}

          <text
            x={
              labelWidth +
              chartWidth +
              totalsWidth / 2
            }
            y={28}
            textAnchor="middle"
            className="total-header-label"
          >
            Total
          </text>

          {rows.map((row, rowIndex) => {
            const rowTop =
              headerHeight +
              rowIndex * rowHeight;

            const rowMiddle =
              rowTop + rowHeight / 2;

            const total =
              log.totals[row.key] ?? 0;

            return (
              <g key={row.key}>
                <rect
                  x={0}
                  y={rowTop}
                  width={labelWidth}
                  height={rowHeight}
                  className="status-label-background"
                />

                <line
                  x1={0}
                  x2={width}
                  y1={rowTop}
                  y2={rowTop}
                  className="row-border-line"
                />

                <text
                  x={14}
                  y={rowMiddle - 4}
                  className="status-code-label"
                >
                  {row.shortLabel}
                </text>

                <text
                  x={48}
                  y={rowMiddle + 5}
                  className="status-label"
                >
                  {row.label}
                </text>

                <line
                  x1={labelWidth}
                  x2={
                    labelWidth +
                    chartWidth
                  }
                  y1={rowMiddle}
                  y2={rowMiddle}
                  className="status-line"
                />

                <text
                  x={
                    labelWidth +
                    chartWidth +
                    totalsWidth / 2
                  }
                  y={rowMiddle + 5}
                  textAnchor="middle"
                  className="row-total-label"
                >
                  {formatHours(total)}
                </text>

                {validSegments
                  .filter(
                    (segment) =>
                      segment.duty_status ===
                      row.key,
                  )
                  .map((segment) => (
                    <line
                      key={`${segment.sequence}-${segment.start_hour}-${segment.end_hour}`}
                      x1={hourToX(
                        segment.start_hour,
                      )}
                      x2={hourToX(
                        segment.end_hour,
                      )}
                      y1={rowMiddle}
                      y2={rowMiddle}
                      className="active-line"
                      strokeLinecap="square"
                    />
                  ))}
              </g>
            );
          })}

          {connectorLines.map(
            (connector) => (
              <line
                key={connector.key}
                x1={connector.x}
                x2={connector.x}
                y1={connector.y1}
                y2={connector.y2}
                className="active-line connector-line"
                strokeLinecap="square"
              />
            ),
          )}

          <line
            x1={0}
            x2={width}
            y1={chartBottom}
            y2={chartBottom}
            className="row-border-line"
          />
        </svg>
      </div>

      <div className="remarks">
        <div className="remarks-heading">
          <div>
            <span className="remarks-icon">
              R
            </span>

            <div>
              <h4>Remarks</h4>
              <p>
                Recorded trip activity and
                location events
              </p>
            </div>
          </div>

          <span className="remarks-count">
            {log.remarks.length}{" "}
            {log.remarks.length === 1
              ? "entry"
              : "entries"}
          </span>
        </div>

        {log.remarks.length === 0 ? (
          <div className="remarks-empty">
            No duty activity recorded for this
            day.
          </div>
        ) : (
          <div className="remarks-list">
            {log.remarks.map(
              (remark, index) => (
                <article
                  className="remark-item"
                  key={`${remark.time}-${remark.mile_marker}-${index}`}
                >
                  <time>{remark.time}</time>

                  <div>
                    <p>
                      {remark.description}
                    </p>

                    <small>
                      Mile {remark.mile_marker}
                    </small>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </article>
  );
}