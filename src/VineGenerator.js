// mulberry32 seeded random
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Convert splines to SVG path
function catmullRom2bezier(points) {
  let result = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    if (i === 0) result += `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    else result += ` S ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return result;
}

export function generateVines(brickAgeDays, seed, width = 300, height = 150) {
  let vineStage = "none";
  if (brickAgeDays >= 730) vineStage = "reclaimed";
  else if (brickAgeDays >= 180) vineStage = "leafy";
  else if (brickAgeDays >= 90) vineStage = "branching";
  else if (brickAgeDays >= 21) vineStage = "tendril";

  if (brickAgeDays < 21) return { paths: [], leaves: [], vineStage }; // < 3 weeks

  const random = mulberry32(seed);
  
  // Decide how many main vines to seed from bottom edge
  const numVines = brickAgeDays > 90 ? Math.floor(random() * 3) + 1 : 1;
  const paths = [];
  const leaves = [];
  
  for (let v = 0; v < numVines; v++) {
    // Generate main branch
    const startX = random() * width;
    let currentX = startX;
    let currentY = height;
    const points = [{x: currentX, y: currentY}];
    
    const lengthIter = Math.min(Math.floor(brickAgeDays / 10), 30);
    
    for (let i = 0; i < lengthIter; i++) {
        currentX += (random() - 0.5) * 40;
        currentY -= random() * 20 + 5;
        points.push({x: currentX, y: currentY});
        
        // Branching condition (3+ months)
        if (brickAgeDays >= 90 && random() > 0.8) {
            const bPoints = [{x: currentX, y: currentY}];
            let bx = currentX;
            let by = currentY;
            for (let j = 0; j < 5; j++) {
                bx += (random() - 0.2) * 30; // split angle
                by -= random() * 15;
                bPoints.push({x: bx, y: by});
            }
            paths.push({
                d: catmullRom2bezier(bPoints), 
                width: 1, 
                opacity: 0.6,
                dash: brickAgeDays >= 730 ? "4 4" : "none" // 2 years = mortar creeping
            });
            
            // Leaves on branches if 6+ months
            if (brickAgeDays >= 180) {
                // End leaf
                leaves.push({x: bx, y: by, r: 2 + random() * 3});
            }
        }
    }
    paths.push({
        d: catmullRom2bezier(points), 
        width: 2, 
        opacity: brickAgeDays < 30 ? 0.3 : 0.8, // ghost tendrils at 3 weeks
        dash: brickAgeDays >= 730 ? "2 2" : "none"
    });
    
    if (brickAgeDays >= 180) {
        leaves.push({x: currentX, y: currentY, r: 3 + random() * 4});
    }
  }

  return { paths, leaves, vineStage };
}
