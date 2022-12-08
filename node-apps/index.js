import { exec } from "child_process";
import axios from "axios";
import { writeFile } from "fs";
import chalk from "chalk";

const okLogger = chalk.green;
const errLogger = chalk.red;

const expectedCommands = {
  "fetch-pr-data": false,
};

const filePathway = "ExecResults/pullRequestData.json";

let parsedArgs = getCommandArgs(process.argv);

console.log("Program running with these args: ", parsedArgs, "\n");

function runCommand(cmd) {
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      `Could not exectue command: ${error}`;
      return;
    }

    console.log(`Output: ${stdout} \n-------------------------------------`);
    console.log(`Error: ${stderr} \n-------------------------------------`);

    //Saving the output from the command to a file, this will be overwritten each time the the script is run
    writeOutputFile(stdout);

    //Sending the output from the command to LISA via an anonymous endpoint
    sendDataToLisa(stdout);
  });
}

if (parsedArgs["fetch-pr-data"]) {
  if (!parsedArgs.id || !parsedArgs.repo) {
    console.log(
      errLogger("Missing required arguments: ") +
        "fetch-pr-data requires that you include a Pull Request Id (id=' ') and Repo Name (repo=' ')."
    );
  } else {
    runCommand(
      `gh pr view ${parsedArgs.id} -R sabiocode/${parsedArgs.repo} --json author,number,headRefName,state,title,deletions,files,url`
    );
  }
} else {
  console.log(
    errLogger("Invalid command: ") +
      "Please provide a valid command and try again."
  );
}

function writeOutputFile(fileData) {
  writeFile(filePathway, fileData, (err) => {
    if (err) {
      console.log(
        errLogger(
          `Encountered error trying to write to file (${filePathway}): `,
          err
        )
      );
      throw err;
    } else {
      console.log(
        okLogger(`The file is updated with the given data, (${filePathway})`)
      );
    }
  });
}

function sendDataToLisa(inputString) {
  const inputObject = JSON.parse(inputString);
  const files = inputObject.files;

  let additions = 0;

  for (let i = 0; i < files.length; i++) {
    const element = files[i];
    additions += element.additions;
  }

  let payload = {};
  payload.githubUsername = inputObject.author.login;
  payload.status = inputObject.state.toLowerCase();
  payload.prData = {
    ...inputObject,
    author: payload.githubUsername,
    changedFiles: files.length,
    additions,
  };

  postCall(payload);
}

function postCall(payload) {
  let url = "http://prework.sabio.la/api/github/pullrequestdata";
  const config = {
    method: "POST",
    url: url,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  console.log("Paylod being sent ot LISA: ", payload);

  return axios(config)
    .then((res) => {
      console.log(okLogger(res));
    })
    .catch((err) => {
      console.log(errLogger(err));
    });
}

function getCommandArgs(a = []) {
  let arr = a.slice(2) || [];

  let cmd = { ...expectedCommands };
  cmd[arr[0]?.toLowerCase()] = true;

  let arrParams = arr.slice(1);

  arrParams.forEach((pair) => {
    let parts = pair.split("=");
    cmd[parts[0]] = parts[1];
  });

  // cmd.arrParams = arrParams;
  return cmd;
}

//runCommand(command);
//////////////////// Attempt 1 /////////////////////////////
// async function getPullRequestDataV1() {
//   // Exec output contains both stderr and stdout outputs
//   const data = await exec(command);

//   console.log(data.stdout);
//   return {
//     data: data.stdout,
//     error: data.stderr,
//   };
// }

// getPullRequestDataV1().then((res) => {
//   console.log("Success: ", res);
// });
// .catch((error) => {
//   console.log("Could not execute command: ", error);
// });

// ////////////////////// Attempt 2 /////////////////////////////

// getPullRequestDataV2 = async function () {
//   try {
//     const data = await execute(command);

//     if (!data) {
//       console.log("No data was found.");
//       return;
//     }

//     return data;
//   } catch (error) {
//     console.log("Could not execute command: ", error);
//   }
// };
