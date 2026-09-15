import styles from './styles.module.css';

/** How to fly, as a table of action × device. Both columns show everywhere. */
export default function ControlHints() {
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
