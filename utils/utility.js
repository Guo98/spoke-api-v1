function utcDateToSerial(date) {
  const dateSansTime = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  //   const intPart = Math.round(
  //     (dateSansTime.getTime() - Date.UTC(1899, 11, 30)) / DAY_TO_MS
  //   );
  const fracPart = (date.getTime() - dateSansTime.getTime()) / DAY_TO_MS;
  return intPart + fracPart;
}

export { utcDateToSerial };
