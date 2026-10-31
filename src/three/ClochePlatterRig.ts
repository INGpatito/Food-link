import * as THREE from 'three';

/**
 * Procedural Cloche and Platter 3D Rig with golden orbital ring and kinematic dome.
 * Zero emojis strictly enforced.
 */
export class ClochePlatterRig {
    public masterGroup: THREE.Group;
    public platterGroup: THREE.Group;
    public clocheGroup: THREE.Group;
    public orbitalRingGroup: THREE.Group;
    public foodPlatterMount: THREE.Group;
    public orbitNodes: THREE.Mesh[] = [];

    public materials: Record<string, THREE.Material>;
    private tiltedOrbitRing: THREE.Mesh;
    private finial: THREE.Mesh;
    private glowDisc: THREE.Mesh;
    private reductionRingMat: THREE.MeshPhysicalMaterial;
    public loadingPlaceholderGroup: THREE.Group;
    private holoCore: THREE.Mesh;
    private holoRing: THREE.Mesh;

    constructor() {
        this.masterGroup = new THREE.Group();
        this.masterGroup.position.set(0, -0.38, 0);

        // Build PBR Materials
        this.materials = this.createMaterials();

        // Platter group
        this.platterGroup = new THREE.Group();
        this.masterGroup.add(this.platterGroup);

        // Cloche dome group
        this.clocheGroup = new THREE.Group();
        this.clocheGroup.position.y = 0.06;
        this.masterGroup.add(this.clocheGroup);

        // Orbital ring group
        this.orbitalRingGroup = new THREE.Group();
        this.platterGroup.add(this.orbitalRingGroup);

        // Food platter mount
        this.foodPlatterMount = new THREE.Group();
        this.foodPlatterMount.position.set(0, 0.015, 0);
        this.platterGroup.add(this.foodPlatterMount);

        // 1. Ceramic Platter construction
        const platterPoints = [
            new THREE.Vector2(0.0, -0.20),
            new THREE.Vector2(1.45, -0.20),
            new THREE.Vector2(1.65, -0.12),
            new THREE.Vector2(2.28, -0.02),
            new THREE.Vector2(2.46, 0.10),
            new THREE.Vector2(2.40, 0.15),
            new THREE.Vector2(1.98, 0.04),
            new THREE.Vector2(1.42, -0.06),
            new THREE.Vector2(0.0, -0.06)
        ];
        const platterGeo = new THREE.LatheGeometry(platterPoints, 96);
        const platterMesh = new THREE.Mesh(platterGeo, this.materials.darkCeramic);
        platterMesh.castShadow = true;
        platterMesh.receiveShadow = true;
        this.platterGroup.add(platterMesh);

        const innerPlateGeo = new THREE.CylinderGeometry(1.55, 1.44, 0.05, 80);
        const innerPlateMesh = new THREE.Mesh(innerPlateGeo, this.materials.creamStoneware);
        innerPlateMesh.position.y = -0.02;
        innerPlateMesh.receiveShadow = true;
        this.platterGroup.add(innerPlateMesh);

        const platterRimGeo = new THREE.TorusGeometry(2.42, 0.026, 32, 128);
        const platterRimMesh = new THREE.Mesh(platterRimGeo, this.materials.brassGold);
        platterRimMesh.rotation.x = Math.PI / 2;
        platterRimMesh.position.y = 0.11;
        this.platterGroup.add(platterRimMesh);

        const innerDecorRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.85, 0.015, 24, 96),
            this.materials.rubyAccent
        );
        innerDecorRing.rotation.x = Math.PI / 2;
        innerDecorRing.position.y = 0.06;
        this.platterGroup.add(innerDecorRing);

        // Orbital telemetry ring & 4 orbit nodes
        const outerOrbitRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.72, 0.008, 16, 128),
            this.materials.brassGold
        );
        outerOrbitRing.rotation.x = Math.PI / 2;
        outerOrbitRing.position.y = 0.04;
        this.orbitalRingGroup.add(outerOrbitRing);

        this.tiltedOrbitRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.92, 0.005, 12, 128),
            new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.35 })
        );
        this.tiltedOrbitRing.rotation.x = Math.PI / 2 + 0.14;
        this.orbitalRingGroup.add(this.tiltedOrbitRing);

        for (let i = 0; i < 4; i++) {
            const nodeMesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.045, 1),
                this.materials.orbitNodeGlow
            );
            const angle = (i / 4) * Math.PI * 2;
            nodeMesh.position.set(Math.cos(angle) * 2.72, 0.04, Math.sin(angle) * 2.72);
            this.orbitalRingGroup.add(nodeMesh);
            this.orbitNodes.push(nodeMesh);
        }

        // Under-platter floor glow disc
        this.glowDisc = new THREE.Mesh(
            new THREE.CircleGeometry(2.65, 64),
            new THREE.MeshBasicMaterial({
                color: 0xe05a36,
                transparent: true,
                opacity: 0.08,
                side: THREE.DoubleSide
            })
        );
        this.glowDisc.rotation.x = -Math.PI / 2;
        this.glowDisc.position.y = -0.22;
        this.platterGroup.add(this.glowDisc);

        // 2. Copper Cloche Dome construction
        const clochePoints: THREE.Vector2[] = [];
        const domeRadius = 1.95;
        clochePoints.push(new THREE.Vector2(2.08, 0.0));
        clochePoints.push(new THREE.Vector2(1.97, 0.05));
        clochePoints.push(new THREE.Vector2(1.95, 0.15));
        for (let i = 0; i <= 40; i++) {
            const theta = (i / 40) * (Math.PI / 2);
            const r = Math.cos(theta) * domeRadius;
            const y = 0.15 + Math.sin(theta) * (domeRadius * 0.86);
            clochePoints.push(new THREE.Vector2(r, y));
        }
        const clocheGeo = new THREE.LatheGeometry(clochePoints, 96);
        const clocheDomeMesh = new THREE.Mesh(clocheGeo, this.materials.brushedCopper);
        clocheDomeMesh.castShadow = true;
        clocheDomeMesh.receiveShadow = true;
        this.clocheGroup.add(clocheDomeMesh);

        const clocheWireMesh = new THREE.Mesh(clocheGeo, this.materials.wireframeAccent);
        clocheWireMesh.scale.setScalar(1.004);
        this.clocheGroup.add(clocheWireMesh);

        const clocheInnerRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.96, 0.018, 20, 96),
            this.materials.energyGlow
        );
        clocheInnerRing.rotation.x = Math.PI / 2;
        clocheInnerRing.position.y = 0.04;
        this.clocheGroup.add(clocheInnerRing);

        const crownCollarGeo = new THREE.CylinderGeometry(0.34, 0.48, 0.14, 64);
        const crownCollar = new THREE.Mesh(crownCollarGeo, this.materials.darkCeramic);
        crownCollar.position.y = 1.80;
        this.clocheGroup.add(crownCollar);

        const handleTorusGeo = new THREE.TorusGeometry(0.26, 0.05, 32, 72);
        const handleTorus = new THREE.Mesh(handleTorusGeo, this.materials.brassGold);
        handleTorus.position.y = 2.02;
        this.clocheGroup.add(handleTorus);

        const handleInnerSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.10, 32, 32),
            this.materials.energyGlow
        );
        handleInnerSphere.position.y = 2.02;
        this.clocheGroup.add(handleInnerSphere);

        const finialGeo = new THREE.OctahedronGeometry(0.085, 2);
        this.finial = new THREE.Mesh(finialGeo, this.materials.crystalGlass);
        this.finial.position.y = 2.28;
        this.clocheGroup.add(this.finial);

        // Reduction sauce ring
        this.reductionRingMat = (this.materials.terracottaGlaze as THREE.MeshPhysicalMaterial).clone();
        const reductionRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.48, 0.025, 24, 96),
            this.reductionRingMat
        );
        reductionRing.rotation.x = Math.PI / 2;
        reductionRing.position.y = 0.01;
        this.platterGroup.add(reductionRing);

        // Holographic loading placeholder
        this.loadingPlaceholderGroup = new THREE.Group();
        this.loadingPlaceholderGroup.position.set(0, 0.65, 0);
        this.holoCore = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.65, 2),
            new THREE.MeshBasicMaterial({ color: 0xf4a261, wireframe: true, transparent: true, opacity: 0.35 })
        );
        this.holoRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.015, 16, 64),
            this.materials.energyGlow
        );
        this.holoRing.rotation.x = Math.PI / 3;
        this.loadingPlaceholderGroup.add(this.holoCore, this.holoRing);
        this.foodPlatterMount.add(this.loadingPlaceholderGroup);
    }

    private createMaterials(): Record<string, THREE.Material> {
        return {
            brushedCopper: new THREE.MeshPhysicalMaterial({
                color: 0xd98a54,
                metalness: 0.92,
                roughness: 0.19,
                clearcoat: 0.85,
                clearcoatRoughness: 0.12,
                reflectivity: 1.0,
                iridescence: 0.16,
                iridescenceIOR: 1.8,
                sheen: 0.15,
                sheenRoughness: 0.28,
                sheenColor: new THREE.Color(0xffd8be),
                side: THREE.DoubleSide
            }),
            brassGold: new THREE.MeshPhysicalMaterial({
                color: 0xf6a868,
                metalness: 0.95,
                roughness: 0.12,
                clearcoat: 0.92,
                clearcoatRoughness: 0.06,
                iridescence: 0.2,
                iridescenceIOR: 2.0,
                emissive: 0x331d06,
                emissiveIntensity: 0.35
            }),
            darkCeramic: new THREE.MeshPhysicalMaterial({
                color: 0x171c19,
                metalness: 0.08,
                roughness: 0.22,
                clearcoat: 0.95,
                clearcoatRoughness: 0.08,
                sheen: 0.22,
                sheenRoughness: 0.22,
                sheenColor: new THREE.Color(0x2c3e32)
            }),
            creamStoneware: new THREE.MeshPhysicalMaterial({
                color: 0xf3eee4,
                metalness: 0.03,
                roughness: 0.30,
                clearcoat: 0.62,
                clearcoatRoughness: 0.16,
                sheen: 0.18,
                sheenRoughness: 0.45,
                sheenColor: new THREE.Color(0xfff6ea)
            }),
            terracottaGlaze: new THREE.MeshPhysicalMaterial({
                color: 0xe05a36,
                metalness: 0.12,
                roughness: 0.14,
                clearcoat: 1.0,
                clearcoatRoughness: 0.06,
                emissive: 0x5a1a08,
                emissiveIntensity: 0.65,
                iridescence: 0.12,
                iridescenceIOR: 1.6
            }),
            wireframeAccent: new THREE.MeshBasicMaterial({
                color: 0xf4a261,
                wireframe: true,
                transparent: true,
                opacity: 0.11
            }),
            energyGlow: new THREE.MeshPhysicalMaterial({
                color: 0xffcf86,
                metalness: 0.0,
                roughness: 0.0,
                emissive: 0xf4a261,
                emissiveIntensity: 2.2,
                transparent: true,
                opacity: 0.85
            }),
            orbitNodeGlow: new THREE.MeshPhysicalMaterial({
                color: 0xf4a261,
                metalness: 0.35,
                roughness: 0.14,
                emissive: 0xe05a36,
                emissiveIntensity: 1.85,
                transparent: true,
                opacity: 0.92
            }),
            crystalGlass: new THREE.MeshPhysicalMaterial({
                color: 0xefe5d8,
                metalness: 0.0,
                roughness: 0.0,
                transmission: 0.88,
                thickness: 0.65,
                ior: 1.54,
                clearcoat: 1.0,
                clearcoatRoughness: 0.02,
                iridescence: 0.45,
                iridescenceIOR: 1.85
            }),
            rubyAccent: new THREE.MeshPhysicalMaterial({
                color: 0xb8284c,
                metalness: 0.12,
                roughness: 0.12,
                clearcoat: 1.0,
                clearcoatRoughness: 0.04,
                emissive: 0x4c0a1c,
                emissiveIntensity: 0.65,
                iridescence: 0.3,
                iridescenceIOR: 2.0
            })
        };
    }

    public update(
        elapsedTime: number,
        s: number,
        clocheLift: number,
        clocheOpenFactor: number,
        platterFloatY: number,
        coreCol?: THREE.Color
    ): void {
        this.platterGroup.position.set(0, platterFloatY, 0);

        // Kinematic cloche opening
        this.clocheGroup.position.y = platterFloatY + 0.06 + clocheLift;
        this.clocheGroup.position.z = -clocheOpenFactor * 0.48;

        const tiltBack = clocheOpenFactor * 0.28;
        this.clocheGroup.rotation.z = -clocheOpenFactor * 0.12;
        this.clocheGroup.rotation.x = -tiltBack;
        this.clocheGroup.rotation.y = -elapsedTime * 0.20;

        this.finial.rotation.y = elapsedTime * 1.9;
        this.finial.rotation.x = Math.sin(elapsedTime * 1.5) * 0.22;

        // Orbital telemetry ring & nodes
        this.orbitalRingGroup.rotation.y = elapsedTime * 0.25 + s * 1.8;
        this.tiltedOrbitRing.rotation.z = Math.sin(elapsedTime * 0.8) * 0.18;
        const ringScale = 1.0 + clocheOpenFactor * 0.06 + Math.sin(elapsedTime * 2.0) * 0.01;
        this.orbitalRingGroup.scale.setScalar(ringScale);

        this.orbitNodes.forEach((node, i) => {
            node.rotation.y = elapsedTime * 2.2 + i;
            node.position.y = 0.04 + Math.sin(elapsedTime * 2.5 + i * 1.5) * 0.06;
        });

        // Holographic placeholder spin
        if (this.loadingPlaceholderGroup.visible) {
            this.holoCore.rotation.y = elapsedTime * 1.2;
            this.holoCore.rotation.x = elapsedTime * 0.7;
            this.holoRing.rotation.z = -elapsedTime * 1.5;
        }

        // Glow disc and reduction glaze pulse
        (this.glowDisc.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(elapsedTime * 1.8) * 0.025;
        if (coreCol) {
            (this.glowDisc.material as THREE.MeshBasicMaterial).color.copy(coreCol);
            this.reductionRingMat.color.copy(coreCol);
            this.reductionRingMat.emissive.copy(coreCol);
            this.reductionRingMat.emissiveIntensity = 0.60 + Math.sin(elapsedTime * 1.6) * 0.20;
        }
    }
}
