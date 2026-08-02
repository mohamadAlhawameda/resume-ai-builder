// Binary max-heap used to rank scored jobs by match percentage.
// insert() is O(log n); extractMax() removes and returns the current
// highest-scoring job in O(log n). Draining the heap via repeated
// extractMax() calls yields jobs ordered from best match to worst.

export class MaxHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare; // compare(a, b) > 0 means a outranks b
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  insert(item) {
    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
  }

  extractMax() {
    if (this.items.length === 0) return undefined;
    const max = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return max;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.compare(this.items[index], this.items[parent]) <= 0) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  _bubbleDown(index) {
    const n = this.items.length;
    for (;;) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;
      if (left < n && this.compare(this.items[left], this.items[largest]) > 0) largest = left;
      if (right < n && this.compare(this.items[right], this.items[largest]) > 0) largest = right;
      if (largest === index) break;
      [this.items[index], this.items[largest]] = [this.items[largest], this.items[index]];
      index = largest;
    }
  }
}

/** Rank scored jobs highest-match-first by draining a max-heap keyed on match.percent. */
export function rankByMatchPercent(scoredJobs) {
  const heap = new MaxHeap((a, b) => (a.match?.percent ?? 0) - (b.match?.percent ?? 0));
  for (const job of scoredJobs) heap.insert(job);

  const ranked = [];
  while (heap.size() > 0) ranked.push(heap.extractMax());
  return ranked;
}
