/**
 * ReferenceStore is a special object which stores other objects
 * and provides the reference (number) instead.
 * This reference can then be sent over a json-based communication channel
 * (IPC) to another NodeJS process or a message to the Worker.
 */
export default class ReferenceStore {
  private store = {};
  private indices = [0];

  put(obj: Object): number {
    const id = this.genId();
    this.store[id] = obj;
    return id;
  }

  fetch(id: number) {
    const obj = this.store[id];
    this.store[id] = null;
    delete this.store[id];

    this.releaseId(id);
    return obj;
  }

  private genId(): number {
    let id: number;
    if (this.indices.length === 1) {
      id = this.indices[0]++;
    } else {
      id = this.indices.shift();
    }

    return id;
  }

  private releaseId(id: number) {
    for (let i = 0; i < this.indices.length; i++) {
      if (id < this.indices[i]) {
        this.indices.splice(i, 0, id);
        break;
      }
    }

    for (let i = this.indices.length - 1; i >= 0; i--) {
      if (this.indices[i] - 1 === this.indices[i - 1]) {
        this.indices.pop();
      } else {
        break;
      }
    }
  }
}
