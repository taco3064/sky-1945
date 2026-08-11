import styles from './styles.module.css';

/**
 * How to fly, as a table of action × device.
 *
 * A table rather than a list because the bindings have two axes: what the
 * player wants to do, and what they are holding. A list would have to pick one
 * device and hide the other, which is what the title screen's prompt does —
 * correctly, because a call to action the player cannot follow is noise. This
 * block is reference, and both columns show everywhere: the touch bindings are
 * the half nobody can guess, and a player on a phone has no key to press to
 * discover that a drag anywhere steers.
 *
 * No props. The copy has exactly one caller and describes the input layer the
 * whole game shares, so parameterising it would invent a seam that nothing is
 * pulling on. Where it sits and how wide it is belong to the screen around it,
 * which is why nothing here sets a width.
 */
export function ControlHints() {
  return (
    <table className={styles.controls}>
      <caption className={styles.caption}>CONTROLS</caption>
      <thead>
        <tr>
          <td />
          <th className={styles.device} scope="col">
            KEYS
          </th>
          <th className={styles.device} scope="col">
            TOUCH
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className={styles.action} scope="row">
            STEER
          </th>
          <td className={styles.binding}>ARROW KEYS</td>
          <td className={styles.binding}>DRAG ANYWHERE</td>
        </tr>
        <tr>
          <th className={styles.action} scope="row">
            ROLL
          </th>
          <td className={styles.binding}>SPACE</td>
          <td className={styles.binding}>TAP OR 2ND FINGER</td>
        </tr>
        <tr>
          <th className={styles.action} scope="row">
            PAUSE
          </th>
          <td className={styles.binding}>ESC</td>
          <td className={styles.binding}>❚❚ BUTTON</td>
        </tr>
      </tbody>
    </table>
  );
}
