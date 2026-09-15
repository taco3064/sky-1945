import './ControlsTable.css';

const BINDINGS = [
  { action: 'STEER', keys: 'ARROW KEYS', touch: 'DRAG ANYWHERE' },
  { action: 'ROLL', keys: 'SPACE', touch: 'TAP OR 2ND FINGER' },
  { action: 'PAUSE', keys: 'ESC', touch: '❚❚ BUTTON' },
];

/** The loadout controls table (game-spec 7.4). */
export function ControlsTable() {
  return (
    <table className="controls-table">
      <caption className="controls-table__caption">CONTROLS</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">KEYS</th>
          <th scope="col">TOUCH</th>
        </tr>
      </thead>
      <tbody>
        {BINDINGS.map(({ action, keys, touch }) => (
          <tr key={action}>
            <th scope="row">{action}</th>
            <td>{keys}</td>
            <td>{touch}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
