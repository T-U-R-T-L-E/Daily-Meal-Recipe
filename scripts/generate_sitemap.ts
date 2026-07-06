import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("Generating static sitemap.xml...");
  let adminDb: any = null;
  
  try {
    let appletConfig: any = {};
    try {
      appletConfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
      );
    } catch (e) {
      console.warn("Could not read firebase-applet-config.json for admin init in sitemap generator:", e);
    }

    if (appletConfig.projectId) {
      let app;
      if (getApps().length === 0) {
        try {
          app = initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: appletConfig.projectId,
          });
        } catch (e) {
          app = initializeApp({
            projectId: appletConfig.projectId,
          });
        }
      } else {
        app = getApp();
      }
      const dbId = appletConfig.firestoreDatabaseId || undefined;
      adminDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
      console.log("Firebase Admin Firestore initialized successfully for sitemap generation.");
    }
  } catch (error: any) {
    console.log("Firebase Admin initialization bypassed for static sitemap generation:", error?.message || error);
  }

  const staticPages = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "discover", priority: "0.8", changefreq: "daily" },
    { path: "generate", priority: "0.8", changefreq: "daily" },
    { path: "planner", priority: "0.7", changefreq: "weekly" },
    { path: "shopping", priority: "0.7", changefreq: "weekly" },
    { path: "shared-todos", priority: "0.6", changefreq: "weekly" },
    { path: "pantry", priority: "0.7", changefreq: "weekly" },
    { path: "files", priority: "0.5", changefreq: "monthly" },
    { path: "profile", priority: "0.6", changefreq: "monthly" },
    { path: "subscription", priority: "0.8", changefreq: "monthly" },
    { path: "leaderboard", priority: "0.6", changefreq: "daily" },
    { path: "scanner", priority: "0.7", changefreq: "monthly" },
    { path: "privacy", priority: "0.4", changefreq: "monthly" },
    { path: "terms", priority: "0.4", changefreq: "monthly" },
    { path: "refund-policy", priority: "0.4", changefreq: "monthly" },
    { path: "auth", priority: "0.8", changefreq: "monthly" },
    { path: "blog", priority: "0.9", changefreq: "daily" },
    { path: "blog?post=mastering-simple-food-recipes-5-minute-meals", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=easy-indian-snacks-5-minutes", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=budget-healthy-meals-for-one", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=quick-dinner-ideas-for-2-simple-food-recipes", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=food-recipes-breakfast-guide-easy-5-minutes", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=quick-easy-healthy-meals-for-weight-loss", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=easy-snacks-to-make-in-5-minutes-indian-spiced", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=simple-food-recipes-for-students-budget-meals", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=food-recipes-with-ingredients-few-items", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=simple-indian-vegetarian-recipes-for-dinner-healthy", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=lazy-dinner-ideas-simple-family-meals", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=simple-food-recipes-sweet-5-minute-dessert", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=easy-food-to-make-in-5-minutes-healthy-for-kids", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=quick-easy-healthy-meals-on-a-budget-for-students", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=quick-dinner-ideas-for-2-healthy-meals-for-one", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=food-recipes-app-best-simple-food-recipes-website", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=simple-food-recipes-instagram-healthy-meals", priority: "0.8", changefreq: "weekly" },
    { path: "blog?post=easy-snacks-to-make-in-5-minutes-indian-spiced-fast", priority: "0.8", changefreq: "weekly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of staticPages) {
    const url = `https://dailymealrecipe.online${page.path ? "/" + page.path : ""}`;
    xml += `  <url>\n`;
    xml += `    <loc>${url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  if (adminDb) {
    try {
      const recipesSnap = await adminDb.collection("recipes")
        .where("isPublic", "==", true)
        .where("status", "==", "approved")
        .limit(1000)
        .get();

      if (!recipesSnap.empty) {
        recipesSnap.forEach((doc: any) => {
          const recipeId = doc.id;
          const data = doc.data();
          const updatedAt = data.updatedAt?.toDate 
            ? data.updatedAt.toDate().toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0];

          xml += `  <url>\n`;
          xml += `    <loc>https://dailymealrecipe.online/recipe/${recipeId}</loc>\n`;
          xml += `    <lastmod>${updatedAt}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        });
      }
    } catch (err: any) {
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes("permission_denied") || msg.includes("insufficient permissions") || err?.code === 7) {
        console.log("Firestore database access is restricted or not authorized in this build environment (this is expected during static build steps). Static sitemap routes were generated successfully.");
      } else {
        console.log("Sitemap recipe generation bypassed:", err?.message || err);
      }
    }
  }

  xml += `</urlset>`;

  const destDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destPath = path.join(destDir, "sitemap.xml");
  fs.writeFileSync(destPath, xml, "utf8");
  console.log(`Successfully generated physical sitemap.xml at ${destPath}`);
}

run().catch((err) => {
  console.error("Sitemap generator crashed:", err);
  process.exit(1);
});
