import OutCall "http-outcalls/outcall";

actor {
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func processRequest(url : Text) : async Text {
    await OutCall.httpGetRequest(url, [], transform);
  };
};
