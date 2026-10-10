// Minimal typings for the parts of clipper-lib we use (polygon offsetting).
declare module 'clipper-lib' {
  export interface IntPoint {
    X: number
    Y: number
  }
  export type Path = IntPoint[]
  export type Paths = Path[]
  export const JoinType: { jtSquare: number; jtRound: number; jtMiter: number }
  export const EndType: { etClosedPolygon: number }
  export class ClipperOffset {
    constructor(miterLimit?: number, arcTolerance?: number)
    AddPath(path: Path, joinType: number, endType: number): void
    Execute(solution: Paths, delta: number): void
  }
  export class Clipper {
    static Orientation(path: Path): boolean
    static CleanPolygon(path: Path, distance?: number): Path
  }
  const ClipperLib: {
    ClipperOffset: typeof ClipperOffset
    Clipper: typeof Clipper
    JoinType: typeof JoinType
    EndType: typeof EndType
  }
  export default ClipperLib
}
