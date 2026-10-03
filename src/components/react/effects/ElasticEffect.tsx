import "./elastic.css";

export default function ElasticEffect() {
  return (
    <svg
      className="store-fx-elastic"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="store-fx-elastic__ribbon store-fx-elastic__ribbon--primary">
        <path
          d="M-120 122C146 28 354 46 598 184L570 238C331 116 145 109-120 188Z"
          fill="var(--store-accent)"
        />
        <path
          d="M-120 147C151 57 345 74 578 202"
          fill="none"
          stroke="var(--store-text)"
          strokeOpacity="0.2"
          strokeWidth="3"
        />
      </g>
      <g className="store-fx-elastic__ribbon store-fx-elastic__ribbon--secondary">
        <path
          d="M1138-96C1280 144 1303 339 1212 580L1264 602C1376 345 1365 130 1206-96Z"
          fill="var(--store-accent-secondary)"
        />
        <path
          d="M1168-96C1304 143 1320 337 1238 590"
          fill="none"
          stroke="var(--store-text)"
          strokeOpacity="0.18"
          strokeWidth="3"
        />
      </g>
      <g className="store-fx-elastic__ribbon store-fx-elastic__ribbon--tertiary">
        <path
          d="M698 792C910 688 1123 699 1376 836L1408 786C1133 624 891 617 676 738Z"
          fill="var(--store-accent-tertiary)"
        />
        <path
          d="M692 766C904 653 1121 665 1392 810"
          fill="none"
          stroke="var(--store-text)"
          strokeOpacity="0.2"
          strokeWidth="3"
        />
      </g>
      <g className="store-fx-elastic__ribbon store-fx-elastic__ribbon--tension">
        <path
          d="M66 656C192 558 316 536 458 590L442 631C310 585 197 614 84 704Z"
          fill="var(--store-accent-secondary)"
        />
        <path
          d="M78 681C194 589 309 572 450 611"
          fill="none"
          stroke="var(--store-text)"
          strokeOpacity="0.24"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
