import * as THREE from 'three';
import { lerp } from '../utils/helpers';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private targetPosition: THREE.Vector3;
  private currentPosition: THREE.Vector3;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetMouseX: number = 0;
  private targetMouseY: number = 0;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);
    
    this.targetPosition = this.camera.position.clone();
    this.currentPosition = this.camera.position.clone();

    this.setupMouseEvents();
  }

  private setupMouseEvents(): void {
    window.addEventListener('mousemove', (event: MouseEvent) => {
      // Normalize mouse coords (-1 to 1)
      this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      this.targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });
  }

  public update(): void {
    // Smooth damping for mouse parallax
    this.mouseX = lerp(this.mouseX, this.targetMouseX, 0.05);
    this.mouseY = lerp(this.mouseY, this.targetMouseY, 0.05);

    // Apply subtle parallax to camera
    this.camera.position.x = this.currentPosition.x + this.mouseX * 0.4;
    this.camera.position.y = this.currentPosition.y + this.mouseY * 0.3;
    this.camera.position.z = this.currentPosition.z;

    this.camera.lookAt(0, 0, 0);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.currentPosition.set(x, y, z);
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    // Adjust camera Z on mobile devices so models fit nicely
    if (width < 768) {
      this.camera.position.z = 9.5;
      this.currentPosition.z = 9.5; //dudo de mi existencia 
    } else {
      this.camera.position.z = 7.5;
      this.currentPosition.z = 7.5;
    }
    this.camera.updateProjectionMatrix();
  }
}
