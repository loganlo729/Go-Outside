"use client";

import dynamic from "next/dynamic";
// This relative import reaches out of 'src/app/docs' up to 'apps/web/lib/swagger.json'
import spec from "../../../lib/swagger.json"; 
import "swagger-ui-react/swagger-ui.css";

// Prevent SSR crashes since swagger-ui relies heavily on browser DOM APIs
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocs() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <SwaggerUI spec={spec} />
    </div>
  );
}
