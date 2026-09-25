import * as T from 'three';

/** Closed, rounded annular enclosure. Local Z follows the finger; units are metres. */
export function createSensorRing(innerRadius = .010) {
  const ring = new T.Group();
  ring.name = 'Solid optical PSG ring';
  const wall = .0024, width = .009, bevel = .00065;
  const profile: T.Vector2[] = [];
  // Rounded rectangular radial cross-section, including the inner wall and both end faces.
  for (const [r, z, start] of [
    [innerRadius + bevel, -width / 2 + bevel, Math.PI],
    [innerRadius + wall - bevel, -width / 2 + bevel, Math.PI * 1.5],
    [innerRadius + wall - bevel, width / 2 - bevel, 0],
    [innerRadius + bevel, width / 2 - bevel, Math.PI / 2],
  ]) {
    for (let i = 0; i <= 6; i++) {
      const a = start + i / 6 * Math.PI / 2;
      profile.push(new T.Vector2(r + bevel * Math.cos(a), z + bevel * Math.sin(a)));
    }
  }
  profile.push(profile[0].clone());
  const geometry = new T.LatheGeometry(profile, 96);
  geometry.rotateX(Math.PI / 2);
  const housing = new T.Mesh(geometry, new T.MeshStandardMaterial({
    color: 0x344047, metalness: .62, roughness: .28,
  }));
  housing.name = 'Closed titanium-style housing';
  ring.add(housing);
  // Subtle machined rims at each shoulder, not a wire-frame ring.
  for (const z of [-.00355, .00355]) {
    const rim = new T.Mesh(new T.TorusGeometry(innerRadius + wall - .00005, .00014, 8, 96),
      new T.MeshStandardMaterial({color: 0x87959c, metalness: .8, roughness: .24}));
    rim.position.z = z;
    ring.add(rim);
  }
  // Flush optical windows face the finger on the palmar inner surface.
  for (const [i, color] of [0x9b1821, 0x231e35, 0x081217].entries()) {
    const window = new T.Mesh(new T.CylinderGeometry(.00105, .00105, .00035, 24),
      new T.MeshStandardMaterial({color, metalness: .15, roughness: .16}));
    window.name = ['Red LED window', 'IR LED window', 'Photodiode window'][i];
    window.position.set(0, -innerRadius + .00006, (i - 1) * .0025);
    ring.add(window);
  }
  const indicator = new T.Mesh(new T.SphereGeometry(.00045, 12, 8),
    new T.MeshStandardMaterial({color: 0x64cfb2, emissive: 0x248266, emissiveIntensity: .35}));
  indicator.scale.y = .25;
  indicator.position.y = innerRadius + wall;
  ring.add(indicator);
  return ring;
}
