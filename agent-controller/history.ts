import fs from "fs";
import path from "path";

export function saveHistory(phaseId: string, runId: string, data: any) {
    const historyDir = ".agent/history";
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir);
    
    const filePath = path.join(historyDir, `${phaseId}-${runId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
