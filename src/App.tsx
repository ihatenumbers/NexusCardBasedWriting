/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas } from './components/Canvas';

export default function App() {
  return (
    <div className="dark min-h-screen bg-[#0a0b0d] text-gray-100 antialiased selection:bg-blue-500/30">
      <Canvas />
    </div>
  );
}

